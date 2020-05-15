import uuid from "uuid";
import { produce } from "immer";
import { PubSub } from "graphql-subscriptions";
import { roll } from "@airjp73/dice-notation";

export type ChatMessageNode =
  | { type: "TEXT"; content: string }
  | {
      type: "DICE_ROLL";
      content:
        | {
            type: "ERROR";
            notation: string;
          }
        | {
            type: "SUCCESS";
            result: ReturnType<typeof roll>;
          };
    };

export type ApplicationRecordSchema = {
  id: string;
  rawContent: Array<ChatMessageNode>;
  authorName: string;
  createdAt: number;
};

const tryRoll = (input: string) => {
  try {
    const result = roll(input);
    return {
      type: "SUCCESS" as const,
      result,
    };
  } catch (err) {
    return {
      type: "ERROR" as const,
      notation: input,
    };
  }
};

const processDiceRolls = (message: string): Array<ChatMessageNode> => {
  const parts = message.split(/(\[.*\])/g).filter(Boolean);

  return parts.map((part) => {
    if (part.startsWith("[") && part.endsWith("]")) {
      const notation = part.slice(1, part.length - 1);
      const content = tryRoll(notation);
      return {
        type: "DICE_ROLL" as const,
        content,
      };
    } else {
      return {
        type: "TEXT" as const,
        content: part,
      };
    }
  });
};

type NewMessagesPayload = {
  messages: Array<ApplicationRecordSchema>;
};

export const createChat = () => {
  let state: Array<ApplicationRecordSchema> = [];
  const pubSub = new PubSub({});

  const addMessage = (args: { authorName: string; rawContent: string }) => {
    const message: ApplicationRecordSchema = {
      id: uuid.v4(),
      createdAt: new Date().getTime(),
      ...args,
      rawContent: processDiceRolls(args.rawContent),
    };

    state = produce(state, (state) => {
      state.push(message);
      if (state.length > 30) {
        state.shift();
      }
    });

    pubSub.publish("NEW_MESSAGES", {
      messages: [message],
    } as NewMessagesPayload);
  };

  return {
    addMessage,
    getMessages: () => state,
    subscribe: {
      newMessages: () =>
        pubSub.asyncIterator<NewMessagesPayload>("NEW_MESSAGES"),
    },
  };
};
