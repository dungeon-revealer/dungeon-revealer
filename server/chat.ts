import { v4 as uuid } from "uuid";
import { roll } from "@airjp73/dice-notation";
import { Liquid, LiquidError } from "liquidjs";
import { createPubSub } from "./pubsub";
import { DiceRollResult, isDiceRollResult, tryRoll } from "./roll-dice";

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
      /** Dice rolls produces via inline [] strings. */
      diceRolls: DiceRollResult[];
      /** Dice rolls produces via liquid.js diceRoll filter. */
      referencedDiceRolls: DiceRollResult[];
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

const isDiceRoll = (part: string) => part.startsWith("[") && part.endsWith("]");

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

const processVariables = (variables: Record<string, string>) => {
  return Object.fromEntries(
    Object.entries(variables).map(([key, value]) => {
      if (typeof value === "string" && isDiceRoll(value)) {
        const rollResult = tryRoll(value.slice(1, value.length - 1));
        return [key, rollResult];
      }
      return [key, value];
    })
  );
};

type NewMessagesPayload = {
  messages: Array<ApplicationRecordSchema>;
};

const MAXIMUM_CHAT_SIZE = 500;

const diceRollSymbol = Symbol("DiceRoll");

const createTemplateEngine = () => {
  const templateEngine = new Liquid({
    fs: {
      exists: () => Promise.reject(new Error("Not supported.")),
      readFile: () => Promise.reject(new Error("Not supported.")),
      readFileSync: () => {
        throw new Error("Not supported.");
      },
      existsSync: () => {
        throw new Error("Not supported.");
      },
      resolve: () => {
        throw new Error("Not supported.");
      },
    },
  });

  templateEngine.registerTag("renderDiceRoll", {
    parse: function (tagToken) {
      this.variable = tagToken.args;
    },
    render: function* (ctx) {
      const scope = ctx.bottom() as any;
      const maybeDiceRoll = scope[this.variable];

      if (isDiceRollResult(maybeDiceRoll)) {
        (ctx.environments as any)[diceRollSymbol].push(maybeDiceRoll);
        return `{r${(ctx.environments as any)[diceRollSymbol].length - 1}}`;
      }
      return "ERROR: Not a dice roll";
    },
  });
  templateEngine.registerFilter("diceRoll", (value) => tryRoll(value));
  return templateEngine;
};

export const createChat = () => {
  const templateEngine = createTemplateEngine();
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

  const addUserMessage = (args: {
    authorName: string;
    rawContent: string;
    variables: { [key: string]: string };
  }): null | string => {
    const { content, diceRolls } = processRawContent(args.rawContent);
    const variables = args.variables;

    const vars = processVariables(variables);
    const scope = {
      context: {
        authorName: args.authorName,
      },
      vars,
      [diceRollSymbol]: [],
    };

    try {
      const text = templateEngine.parseAndRenderSync(content, scope);

      const message: ApplicationRecordSchema = {
        id: uuid(),
        type: "USER_MESSAGE",
        createdAt: new Date().getTime(),
        authorName: args.authorName,
        content: text,
        diceRolls,
        referencedDiceRolls: scope[diceRollSymbol],
      };
      addMessageToStack(message);

      return null;
    } catch (err) {
      if (err instanceof LiquidError) {
        return err.message + "\n\n" + err.context;
      }
      return "Unexpected Error occurred.";
    }
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
