import { merge, namespaced } from "overmind/config";
import * as sessionStore from "./session-store";
import * as noteStore from "./note-store";
import * as noteEditor from "./note-editor";
import * as tokenInfoAside from "./token-info-aside";

export const state = {};

export const config = merge(
  {
    state
  },
  namespaced({
    sessionStore,
    noteStore,
    noteEditor,
    tokenInfoAside
  })
);
