import { Converter as HtmlConverter } from "showdown";
import { buildUrl } from "../public-url";

export const convertHtml = (markdown: string) => {
  const converter = new HtmlConverter({});

  // transform relative url to public url for images
  converter.addExtension({
    type: "lang",
    filter: function (text) {
      const regex = /\!\[(.*)\]\((\/.*\))/;
      const res = text.match(regex);
      if (res === null) return text;
      return `![${res[1]}](${buildUrl(res[2])}`;
    },
  });

  return converter.makeHtml(markdown);
};
