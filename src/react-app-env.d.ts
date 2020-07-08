/// <reference types="react-scripts" />

module "babel-plugin-relay/macro" {
  export default (str: TemplateStringsArray) => any;
}

module "*.mp3" {
  export default string;
}

interface SVGElement extends Element {
  beginElement(): SVGElement;
}
