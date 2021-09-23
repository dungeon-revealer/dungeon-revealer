import once from "lodash/once";
import flatMap from "lodash/flatMap";
import * as os from "os";
import { bootstrapServer } from "./server";
import { getEnv } from "./env";
import type { Socket } from "net";

const env = getEnv(process.env);

const getPublicInterfaces = () => {
  const ifaces = os.networkInterfaces();
  const publicInterfaces: Array<string> = [];
  for (const iface of flatMap(Object.values(ifaces))) {
    if (iface == null || iface.family !== "IPv4") {
      continue;
    }
    publicInterfaces.push(`http://${iface.address}:${env.PORT}`);
  }
  return publicInterfaces;
};

const getListeningAddresses = () => {
  if (env.HOST === "0.0.0.0") {
    return getPublicInterfaces();
  }
  return [`http://${env.HOST}:${env.PORT}`];
};

bootstrapServer(env).then(({ httpServer }) => {
  const server = httpServer.listen(env.PORT, env.HOST, () => {
    let versionString;
    if (env.VERSION.status === "release") {
      versionString = env.VERSION.appVersion;
    } else if (env.VERSION.status === "development") {
      versionString = `${env.VERSION.commit}\nThis development version is ${env.VERSION.commitsAhead} commits ahead of ${env.VERSION.tag}!\n`;
    } else {
      versionString = `${env.VERSION.appVersion}\nI couldn't verify the git commit of this version, but I think it's based on ${env.VERSION.appVersion}.\n`;
    }

    console.log(`\nStarting dungeon-revealer@${versionString} 

Configuration:
- HOST: ${env.HOST} 
- PORT: ${env.PORT}
- PUBLIC_URL: ${env.PUBLIC_URL || "<none>"}

dungeon-revealer is reachable via the following addresses:
`);

    const addresses = getListeningAddresses();

    addresses.forEach((address) => {
      console.log(`- ${address}`);
    });

    console.log(`
Player Section: ${addresses[0]}
DM Section: ${addresses[0]}/dm`);

    console.log(`\n-------------------\n`);
  });

  const connections = new Set<Socket>();
  server.on("connection", (connection) => {
    connections.add(connection);
    connection.on("close", () => {
      connections.delete(connection);
    });
  });

  const shutdownHandler = once(() => {
    console.log("Shutting down");
    httpServer.close((err) => {
      if (err) {
        console.error(err);
        process.exitCode = 1;
      }
    });

    for (const connection of connections) {
      connection.destroy();
    }
  });

  process.on("SIGINT", shutdownHandler);
});
