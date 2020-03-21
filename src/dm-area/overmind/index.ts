import { IConfig } from "overmind";
import { merge, namespaced } from "overmind/config";
import * as sessionStore from "./session-store";
import * as noteStore from "./note-store";
import * as noteEditor from "./note-editor";
import * as tokenInfoAside from "./token-info-aside";
import * as selectTokenMarkerReferenceModal from "./select-token-marker-reference-modal";

export const state = {};

export const config = merge(
  {
    state
  },
  namespaced({
    sessionStore,
    noteStore,
    noteEditor,
    tokenInfoAside,
    selectTokenMarkerReferenceModal
  })
);

declare module "overmind" {
  interface Config extends IConfig<typeof config> {}
}
