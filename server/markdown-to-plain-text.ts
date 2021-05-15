import sanitizeHtml from "sanitize-html";
import showdown from "showdown";

export const markdownToPlainText = (text: string) => {
  const converter = new showdown.Converter({
    tables: true,
  });

  return sanitizeHtml(converter.makeHtml(text), {
    allowedTags: [],
    nonTextTags: [
      "style",
      "script",
      "textarea",
      "option",
      "noscript",
      /* We filter out the breadcrumb because it does not provide us any information we want to search for :) */
      "breadcrumb",
    ],
  })
    .trimStart()
    .replace(/^\n*/, "");
};

export const shortenText =
  (length: number, delimiter = " ", appendix = "...") =>
  (text: string) => {
    if (text.length <= length) return text;

    let trimmedStr = text.substr(0, length + delimiter.length);

    const lastDelimiterIndex = trimmedStr.lastIndexOf(delimiter);
    if (lastDelimiterIndex >= 0)
      trimmedStr = trimmedStr.substr(0, lastDelimiterIndex);

    if (trimmedStr) trimmedStr += appendix;
    return trimmedStr;
  };
