import { v4 as uuid } from "uuid";
import { roll } from "@airjp73/dice-notation";
import { createPubSub } from "./pubsub";
import { DiceRollResult, tryRoll } from "./roll-dice";

type SharedResourceType =
  | { type: "NOTE"; id: string }
  | {
      type: "IMAGE";
      id: string;
    };

export type DiceTokenType = ReturnType<typeof roll>["tokens"][0];

export type ApplicationRecordSchema =
  | {
      type: "USER_MESSAGE";
      id: string;
      content: string;
      diceRolls: DiceRollResult[];
      authorName: string;
      createdAt: number;
    }
  | {
      type: "OPERATIONAL_MESSAGE";
      id: string;
      content: string;
      createdAt: number;
    }
  | {
      type: "SHARED_RESOURCE";
      id: string;
      resource: SharedResourceType;
      authorName: string;
      createdAt: number;
    };

const processRawContent = (
  message: string
): { content: string; diceRolls: DiceRollResult[] } => {
  const parts = message.split(/(\[[^\[]*\])/).filter(Boolean);

  const diceRolls: DiceRollResult[] = [];
  let diceRollIndex = 0;
  let content = "";

  for (const part of parts) {
    if (part.startsWith("[") && part.endsWith("]")) {
      const notation = part.slice(1, part.length - 1);
      const rollResult = tryRoll(notation);
      if (rollResult) {
        diceRolls.push(rollResult);
        content = content + `{${diceRollIndex}}`;
        diceRollIndex = diceRollIndex + 1;
        continue;
      }
      // in case the parsing fails we just return it as a basic text node
    }
    content = content + part;
  }

  return { content, diceRolls };
};

type NewMessagesPayload = {
  messages: Array<ApplicationRecordSchema>;
};

const MAXIMUM_CHAT_SIZE = 500;

export const createChat = () => {
  let state: Array<ApplicationRecordSchema> = [];
  const pubSub = createPubSub<NewMessagesPayload>();

  const addMessageToStack = (message: ApplicationRecordSchema) => {
    state.push(message);
    if (state.length > MAXIMUM_CHAT_SIZE) {
      state.shift();
    }

    pubSub.publish({
      messages: [message],
    });
  };

  const addUserMessage = (args: { authorName: string; rawContent: string }) => {
    const { content, diceRolls } = processRawContent(args.rawContent);
    const message: ApplicationRecordSchema = {
      id: uuid(),
      type: "USER_MESSAGE",
      createdAt: new Date().getTime(),
      ...args,
      content,
      diceRolls,
    };
    addMessageToStack(message);
  };

  const addSharedResourceMessage = (args: {
    authorName: string;
    resource: SharedResourceType;
  }) => {
    const message: ApplicationRecordSchema = {
      id: uuid(),
      type: "SHARED_RESOURCE",
      createdAt: new Date().getTime(),
      ...args,
    };
    addMessageToStack(message);
  };

  const addOperationalMessage = (args: { content: string }) => {
    const message: ApplicationRecordSchema = {
      id: uuid(),
      type: "OPERATIONAL_MESSAGE",
      createdAt: new Date().getTime(),
      content: args.content,
    };
    addMessageToStack(message);
  };

  return {
    addUserMessage,
    addSharedResourceMessage,
    addOperationalMessage,
    getMessages: () => state,
    subscribe: {
      newMessages: () => pubSub.subscribe(),
    },
  };
};
