import { randomUUID } from "crypto";
import { roll } from "@airjp73/dice-notation";
import { Liquid, LiquidError } from "liquidjs";
import type { Json } from "fp-ts/lib/Json";
import type { PubSub } from "@graphql-yoga/subscription";
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
        content = content + `{${diceRollIndex}}`;
        diceRollIndex = diceRollIndex + 1;
        diceRolls.push(rollResult(String(diceRollIndex)));
        continue;
      }
      // in case the parsing fails we just return it as a basic text node
    }
    content = content + part;
  }

  return { content, diceRolls };
};

const processVariables = (
  variables: Record<string, string>
): Record<string, DiceRollResult | Json> => {
  return Object.fromEntries(
    Object.entries(variables).map(([key, value]) => {
      if (typeof value === "string" && isDiceRoll(value)) {
        const rollResult = tryRoll(value.slice(1, value.length - 1));
        return [key, rollResult?.(key) ?? value];
      }
      return [key, value];
    })
  );
};

const diceRollSymbol = Symbol("DiceRoll");
const generateIdSymbol = Symbol("GenerateId");

export type NewMessagesPayload = {
  messages: Array<ApplicationRecordSchema>;
};

type TemplateEnvironment = {
  /**
   * A context with some random information that can be referenced from within the template.
   */
  context: {
    authorName: string;
  };
  /**
   * The vars sent from the client, that can be referenced from within the template.
   */
  vars: Record<string, DiceRollResult | Json>;
  /**
   * All dice that are generated during template evaluation are put into this array.
   */
  [diceRollSymbol]: Array<DiceRollResult>;
  /**
   * The dice rolls generated via the `diceRoll` filter receive a unique id.
   */
  [generateIdSymbol]: () => string;
};

const MAXIMUM_CHAT_SIZE = 500;

const createTemplateEngine = () => {
  const templateEngine = new Liquid({
    relativeReference: false,
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
      const scope = ctx.bottom() as Record<string, Json>;
      const maybeDiceRoll = scope[this.variable];
      const environment = ctx.environments as TemplateEnvironment;
      if (isDiceRollResult(maybeDiceRoll)) {
        const rolls = environment[diceRollSymbol];
        rolls.push(maybeDiceRoll);
        return `{r${rolls.length - 1}}`;
      }
      return "ERROR: Not a dice roll";
    },
  });
  templateEngine.registerFilter("diceRoll", function (value) {
    const maybeRoll = tryRoll(value);
    const environment = this.context.environments as TemplateEnvironment;
    const id = environment[generateIdSymbol]();
    return maybeRoll?.(id) ?? null;
  });
  return templateEngine;
};

export type ChatPubSubConfig = {
  newMessage: [NewMessagesPayload];
};

export const createChat = ({
  pubSub,
}: {
  pubSub: PubSub<ChatPubSubConfig>;
}) => {
  const templateEngine = createTemplateEngine();
  let state: Array<ApplicationRecordSchema> = [];

  const addMessageToStack = (message: ApplicationRecordSchema) => {
    state.push(message);
    if (state.length > MAXIMUM_CHAT_SIZE) {
      state.shift();
    }

    pubSub.publish("newMessage", {
      messages: [message],
    });
  };

  const addUserMessage = (args: {
    authorName: string;
    rawContent: string;
    variables: { [key: string]: string };
  }): null | string => {
    // Apply normal dice roll logic
    const { content, diceRolls } = processRawContent(args.rawContent);
    let filterDiceRollIds = 0;
    const scope: TemplateEnvironment = {
      context: {
        authorName: args.authorName,
      },
      vars: processVariables(args.variables),
      [diceRollSymbol]: [],
      [generateIdSymbol]: () => {
        return String(++filterDiceRollIds);
      },
    };

    try {
      const text = templateEngine.parseAndRenderSync(content, scope);
      const message: ApplicationRecordSchema = {
        id: randomUUID(),
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
      id: randomUUID(),
      type: "SHARED_RESOURCE",
      createdAt: new Date().getTime(),
      ...args,
    };
    addMessageToStack(message);
  };

  const addOperationalMessage = (args: { content: string }) => {
    const message: ApplicationRecordSchema = {
      id: randomUUID(),
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
      newMessages: () => pubSub.subscribe("newMessage"),
    },
  };
};
