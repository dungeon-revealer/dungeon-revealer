import { setTimeout } from "timers";
import { PubSub } from "@graphql-yoga/subscription";

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

export type UserPubSubConfig = {
  userUpdate: [UserUpdate];
};

export const createUser = ({
  sendUserConnectedMessage,
  sendUserDisconnectedMessage,
  pubSub,
}: {
  sendUserConnectedMessage: ({ name }: { name: string }) => void;
  sendUserDisconnectedMessage: ({ name }: { name: string }) => void;
  pubSub: PubSub<UserPubSubConfig>;
}) => {
  const users = new Map<string, UserRecord>();

  const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

  const remove = (id: string) => {
    const user = users.get(id) || null;
    users.delete(id);
    pubSub.publish("userUpdate", { type: "REMOVE", data: { userId: id } });
    return user;
  };

  return {
    userConnects: ({ id, name }: { id: string; name: string }) => {
      // Check whether user has disconnected previously
      let timeout = disconnectTimeouts.get(id);
      if (timeout !== undefined) {
        clearTimeout(timeout);
        disconnectTimeouts.delete(id);
      }

      const user = { id, name };
      users.set(id, user);

      if (timeout === undefined) {
        pubSub.publish("userUpdate", { type: "ADD", data: { userId: id } });
        sendUserConnectedMessage({ name: user.name });
      }
      return user;
    },
    update: ({ id, name }: { id: string; name: string }) => {
      const user = users.get(id);
      if (!user) return;
      user.name = name;
      pubSub.publish("userUpdate", { type: "CHANGE", data: { userId: id } });
    },
    userDisconnects: (id: string) => {
      // When a user disconnects we wait a few seconds before removing him from the list of online users.
      const timeout = setTimeout(() => {
        disconnectTimeouts.delete(id);
        const user = remove(id);
        if (user) {
          sendUserDisconnectedMessage({ name: user.name });
        }
      }, 10000).unref();
      disconnectTimeouts.set(id, timeout);
    },
    get: (id: string) => users.get(id) || null,
    getUsers: () => Array.from(users.values()),
    subscribe: {
      userUpdate: () => pubSub.subscribe("userUpdate"),
    },
  };
};
