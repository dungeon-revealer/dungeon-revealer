import uuid from "uuid";
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
      resource: {
        type: "NOTE";
        id: string;
      };
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
  const pubSub = new PubSub({});

  const addMessageToStack = (message: ApplicationRecordSchema) => {
    state.push(message);
    if (state.length > MAXIMUM_CHAT_SIZE) {
      state.shift();
    }

    pubSub.publish("NEW_MESSAGES", {
      messages: [message],
    } as NewMessagesPayload);
  };

  const addUserMessage = (args: { authorName: string; rawContent: string }) => {
    const { content, diceRolls } = processRawContent(args.rawContent);
    const message: ApplicationRecordSchema = {
      id: uuid.v4(),
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
    resource: { type: "NOTE"; id: string };
  }) => {
    const message: ApplicationRecordSchema = {
      id: uuid.v4(),
      type: "SHARED_RESOURCE",
      createdAt: new Date().getTime(),
      ...args,
    };
    addMessageToStack(message);
  };

  const addOperationalMessage = (args: { content: string }) => {
    const message: ApplicationRecordSchema = {
      id: uuid.v4(),
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
      newMessages: () =>
        pubSub.asyncIterator<NewMessagesPayload>("NEW_MESSAGES"),
    },
  };
};
