import { PubSub } from "graphql-subscriptions";

export type UserRecord = {
  id: string;
  name: string;
};

export type UserUpdate =
  | {
      type: "ADD";
      data: { userId: string };
    }
  | {
      type: "CHANGE";
      data: { userId: string };
    }
  | {
      type: "REMOVE";
      data: { userId: string };
    };

export const createUser = () => {
  const users = new Map<string, UserRecord>();
  const pubSub = new PubSub();

  return {
    add: ({ id, name }: { id: string; name: string }) => {
      const user = { id, name };
      users.set(id, user);
      pubSub.publish("USER_UPDATE", { type: "ADD", data: { userId: id } });
      return user;
    },
    update: ({ id, name }: { id: string; name: string }) => {
      const user = users.get(id);
      if (!user) return;
      user.name = name;
      pubSub.publish("USER_UPDATE", { type: "CHANGE", data: { userId: id } });
    },
    remove: (id: string) => {
      users.delete(id);
      pubSub.publish("USER_UPDATE", { type: "REMOVE", data: { userId: id } });
    },
    get: (id: string) => users.get(id) || null,
    getUsers: () => Array.from(users.values()),
    subscribe: {
      userUpdate: () => pubSub.asyncIterator<UserUpdate>("USER_UPDATE"),
    },
  };
};
