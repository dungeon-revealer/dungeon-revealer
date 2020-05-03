import uuid from "uuid";
import { produce } from "immer";
import { EventEmitter } from "events";

type ApplicationRecordSchema = {
  id: string;
  rawContent: string;
  authorName: string;
  createdAt: number;
};

export const createChat = () => {
  let state: Array<ApplicationRecordSchema> = [];
  const emitter = new EventEmitter();

  const addMessage = (
    args: Pick<ApplicationRecordSchema, "authorName" | "rawContent">
  ) => {
    const message: ApplicationRecordSchema = {
      id: uuid.v4(),
      createdAt: new Date().getTime(),
      ...args,
    };

    state = produce(state, (state) => {
      state.push(message);
      if (state.length > 30) {
        state.shift();
      }
    });

    emitter.emit("update", { nextState: state });
  };

  return {
    addMessage,
    getMessages: () => state,
    emitter,
  };
};
