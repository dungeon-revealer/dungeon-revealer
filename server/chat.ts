import uuid from "uuid";
import { produce } from "immer";
import { PubSub } from "graphql-subscriptions";
import { roll } from "@airjp73/dice-notation";

export type DiceRollDetail =
  | {
      type: "DiceRoll";
      content: string;
      detail: {
        max: number;
        min: number;
      };
      rolls: Array<number>;
    }
  | {
      type: "Constant";
      content: string;
    }
  | {
      type: "Operator";
      content: string;
    }
  | {
      type: "OpenParen";
      content: string;
    }
  | {
      type: "CloseParen";
      content: string;
    };

export type DiceRollResult = {
  result: number;
  detail: Array<DiceRollDetail>;
};

export type ChatMessageNode =
  | { type: "TEXT"; content: string }
  | {
      type: "DICE_ROLL";
      content: DiceRollResult;
    };

export type DiceTokenType = ReturnType<typeof roll>["tokens"][0];

export type ApplicationRecordSchema = {
  id: string;
  content: Array<ChatMessageNode>;
  authorName: string;
  createdAt: number;
};

// We map the result to our own representation
const tryRoll = (input: string): DiceRollResult | null => {
  try {
    const result = roll(input);
    return {
      result: result.result,
      detail: result.tokens.map((token, index) => {
        if (token.type === "DiceRoll") {
          if (token.detailType === "_SimpleDieRoll") {
            const rollResuls = result.rolls[index] as number[];
            return {
              type: "DiceRoll" as const,
              content: token.content,
              detail: {
                min: 1,
                max: token.detail.numSides as number,
              },
              rolls: rollResuls,
            };
          } else if (token.detailType === "_Constant") {
            return {
              type: "Constant" as const,
              content: token.content,
            };
          }
          throw new Error("Invalid Type.");
        } else if (token.type === "Operator") {
          return {
            type: "Operator" as const,
            content: token.content,
          };
        } else if (token.type === "OpenParen") {
          return {
            type: "OpenParen" as const,
            content: token.content,
          };
        } else if (token.type === "CloseParen") {
          return {
            type: "CloseParen" as const,
            content: token.content,
          };
        }
        throw new Error("Invalid Type.");
      }),
    };
  } catch (err) {
    return null;
  }
};

const processRawContent = (message: string): Array<ChatMessageNode> => {
  const parts = message.split(/(\[[^\[]*\])/).filter(Boolean);

  return parts.map((part) => {
    if (part.startsWith("[") && part.endsWith("]")) {
      const notation = part.slice(1, part.length - 1);
      const rollResult = tryRoll(notation);
      if (rollResult) {
        return {
          type: "DICE_ROLL" as const,
          content: rollResult,
        };
      }
      // in case the parsing fails we just return it as a basic text node
    }

    return {
      type: "TEXT" as const,
      content: part,
    };
  });
};

type NewMessagesPayload = {
  messages: Array<ApplicationRecordSchema>;
};

const MAXIMUM_CHAT_SIZE = 500;

export const createChat = () => {
  let state: Array<ApplicationRecordSchema> = [];
  const pubSub = new PubSub({});

  const addMessage = (args: { authorName: string; rawContent: string }) => {
    const message: ApplicationRecordSchema = {
      id: uuid.v4(),
      createdAt: new Date().getTime(),
      ...args,
      content: processRawContent(args.rawContent),
    };

    state = produce(state, (state) => {
      state.push(message);
      if (state.length > MAXIMUM_CHAT_SIZE) {
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
