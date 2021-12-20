import postcss, { stringify, Plugin, AnyNode } from "postcss";

const prefixRulesPlugin = (prefix: string): Plugin => ({
  postcssPlugin: "prefix-rules",
  Rule: (ruleNode) => {
    if (!ruleNode.selector.startsWith(prefix)) {
      ruleNode.assign({ selector: `${prefix} ${ruleNode.selector}` });
    }
  },
});

/**
 * Verify whether a property is potential XSS.
 */
const regexJavascriptUrl = /javascript\s*\:/gim;
const isXSSValue = (value: string) => regexJavascriptUrl.test(value);

type CSSRule = boolean | ((value: string) => boolean);

type CSSConfig = Record<string, CSSRule | undefined>;

const cssBasics: CSSConfig = {
  display: true,
  "background-color": true,
};

const cssBox: CSSConfig = {
  padding: true,
  "padding-left": true,
  "padding-right": true,
  "padding-top": true,
  "padding-bottom": true,
  margin: true,
  "margin-left": true,
  "margin-right": true,
  "margin-bottom": true,
  "margin-top": true,
  height: true,
  width: true,
  "max-width": true,
  "min-width": true,
  "max-height": true,
  "min-height": true,
  border: true,
  "border-left": true,
  "border-right": true,
  "border-top": true,
  "border-bottom": true,
  left: true,
  right: true,
  float: true,
};

const cssFont: CSSConfig = {
  color: true,
  "font-size": true,
  "font-family": true,
  "text-align": true,
  "line-height": true,
  "font-style": true,
  "font-weight": true,
  "text-transform": true,
  "text-decoration": true,
  "text-shadow": true,
};

const cssFlex: CSSConfig = {
  flex: true,
  "flex-basis": true,
  "flex-direction": true,
  "flex-flow": true,
  "flex-grow": true,
  "flex-shrink": true,
  "flex-wrap": true,
  order: true,
  "justify-content": true,
  "align-items": true,
  "align-self": true,
  "align-content": true,
};

const allowList: CSSConfig = {
  ...cssBasics,
  ...cssFont,
  ...cssBox,
  ...cssFlex,
};

const applyPropertyAllowListPLugin = (): Plugin => ({
  postcssPlugin: "apply-property-allow-list",
  Declaration: (declarationNode, helpers) => {
    const rule = allowList[declarationNode.prop];

    if (isXSSValue(declarationNode.value) === false) {
      if (rule === true) {
        return;
      }
      if (typeof rule === "function" && rule(declarationNode.value) === true) {
        return;
      }
    }

    declarationNode.replaceWith(
      new helpers.Comment({ text: `REDACTED '${declarationNode.prop}'.` })
    );
  },
});

const stringifyAst = (root: AnyNode) => {
  let result = "";
  stringify(root, (part) => {
    result += part;
  });
  return result;
};

type ProcessUserStyleSheetOptions = {
  selectorScope: string;
};

/**
 * Process a user-defined StyleSheet.
 *
 * Prefixes all rules to be scoped to the provided scope selector in order to avoid user-styles to affect any other styles within dungeon-revealer.
 */
export const processUserStyleSheet =
  (opts: ProcessUserStyleSheetOptions) =>
  (css: string): Promise<Array<string>> =>
    postcss(
      prefixRulesPlugin(opts.selectorScope),
      applyPropertyAllowListPLugin()
    )
      .process(css, { from: undefined })
      .then((result) => result.root.nodes.map((node) => stringifyAst(node)));
