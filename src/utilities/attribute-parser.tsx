type Template = { content: string; variables: Record<string, string> };

type Location = {
  start: number;
  end: number;
};

type StringAttributeValue = {
  type: "stringAttributeValue";
  value: string;
  location: Location;
};

type PlainAttributeValue = {
  type: "plainAttributeValue";
  value: string;
  location: Location;
};

type AttributeValue = StringAttributeValue | PlainAttributeValue;

export type Attribute = {
  type: "attribute";
  value: AttributeValue;
  location: Location;
};

type AttributesMap = Map<string, Attribute>;
enum AttributeStartCharacters {
  singleQuote = `'`,
  doubleQuote = `"`,
  curlyBraces = `{`,
}

enum WhitespaceCharacters {
  lineBreak = "\n",
  space = " ",
}

const whiteSpaceCharacters = new Set<string>([
  WhitespaceCharacters.lineBreak,
  WhitespaceCharacters.space,
]);

/**
 * Parse HTML like attributes from a string
 * In addition to normal HTML this also allows JSX like attributes delimited by curly braces.
 */
export const parseAttributes = (template: string): AttributesMap => {
  const attributesMap: AttributesMap = new Map();
  const variableStartRegex = /([a-z-A-Z][\w\d-]*([\w\d-]+)?)=/;
  let variableStartMatch: null | RegExpExecArray;
  let indexOffset = 0;

  while ((variableStartMatch = variableStartRegex.exec(template)) !== null) {
    const attributeName = variableStartMatch[1];
    const index = variableStartMatch.index + variableStartMatch[0].length;
    let currentIndex = index;
    let startCharacter: {
      type: AttributeValue["type"];
      startIndex: number;
      endIndex: number | null;
      character: AttributeStartCharacters;
    } | null = null;

    let curlyBraceStackCount = 0;
    let encounteredIllegalCharacter = false;
    do {
      const character = template[currentIndex];
      if (startCharacter === null) {
        if (
          character === AttributeStartCharacters.singleQuote ||
          character === AttributeStartCharacters.doubleQuote ||
          character === AttributeStartCharacters.curlyBraces
        ) {
          startCharacter = {
            type:
              character === AttributeStartCharacters.curlyBraces
                ? "plainAttributeValue"
                : "stringAttributeValue",
            startIndex: currentIndex + 1,
            endIndex: null,
            character,
          };
        } else if (whiteSpaceCharacters.has(character) === false) {
          encounteredIllegalCharacter = true;
          continue;
        }
      } else {
        if (
          (character === AttributeStartCharacters.singleQuote &&
            startCharacter.character ===
              AttributeStartCharacters.singleQuote) ||
          (character === AttributeStartCharacters.doubleQuote &&
            startCharacter.character === AttributeStartCharacters.doubleQuote)
        ) {
          startCharacter.endIndex = currentIndex;
        } else if (
          startCharacter.character === AttributeStartCharacters.curlyBraces
        ) {
          if (character === "{") {
            curlyBraceStackCount++;
          } else if (character === "}") {
            if (curlyBraceStackCount === 0) {
              startCharacter.endIndex = currentIndex;
            } else {
              curlyBraceStackCount--;
            }
          }
        }
      }

      currentIndex++;
    } while (
      currentIndex < template.length &&
      startCharacter?.endIndex == null &&
      encounteredIllegalCharacter === false
    );

    if (startCharacter?.endIndex != null) {
      attributesMap.set(attributeName, {
        type: "attribute",
        value: {
          type: startCharacter.type,
          value: template.substring(
            startCharacter.startIndex,
            startCharacter.endIndex
          ),
          location: {
            start: indexOffset + startCharacter.startIndex,
            end: indexOffset + startCharacter.endIndex,
          },
        },
        location: {
          start: indexOffset + variableStartMatch.index,
          end: indexOffset + startCharacter.endIndex + 1,
        },
      });

      template = template.substring(startCharacter.endIndex);
      indexOffset = indexOffset + startCharacter.endIndex;
    } else {
      // if we fail to parse the var we try the next
      // TODO: We could instead also return some error state, so we can show an error hint.
      template = template.substring(index);
      indexOffset = indexOffset + index;
    }
  }

  return attributesMap;
};

export const parseTemplateAttributes = (template: string) => {
  const attributes = parseAttributes(template);
  let id: null | Attribute = null;
  let variables = new Map<string, Attribute>();

  for (const [name, attribute] of attributes.entries()) {
    if (name.startsWith("var-")) {
      variables.set(name.replace("var-", ""), attribute);
    } else if (name === "id") {
      if (attribute.value.type !== "stringAttributeValue") {
        throw new Error("The id attribute must be a static string.");
      }
      id = attribute;
    }
  }

  if (id == null) {
    // TODO: return some error description instead, so we can hint the user.
    return null;
  }

  return { id, variables };
};
