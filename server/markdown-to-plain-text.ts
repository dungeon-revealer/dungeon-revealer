import sanitizeHtml from "sanitize-html";
import * as showdown from "showdown";

export const markdownToPlainText = (text: string) => {
  const converter = new showdown.Converter({
    tables: true,
  });

  return sanitizeHtml(converter.makeHtml(text), {
    allowedTags: [],
  });
};

export const shortenText = (
  length: number,
  delimiter = " ",
  appendix = "..."
) => (text: string) => {
  if (text.length <= length) return text;

  let trimmedStr = text.substr(0, length + delimiter.length);

  const lastDelimiterIndex = trimmedStr.lastIndexOf(delimiter);
  if (lastDelimiterIndex >= 0)
    trimmedStr = trimmedStr.substr(0, lastDelimiterIndex);

  if (trimmedStr) trimmedStr += appendix;
  return trimmedStr;
};
