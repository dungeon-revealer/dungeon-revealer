"use strict";

require("debug")("dungeon-revealer");
const once = require("lodash/once");
const flatMap = require("lodash/flatMap");
const { bootstrapServer } = require("./server");
const os = require("os");
const env = require("./env");

const getPublicInterfaces = () => {
  const ifaces = os.networkInterfaces();
  return flatMap(Object.values(ifaces))
    .filter((iface) => iface.family === "IPv4")
    .map((iface) => `http://${iface.address}:${env.PORT}`);
};

const getListeningAddresses = () => {
  if (env.HOST === "0.0.0.0") {
    return getPublicInterfaces();
  } else {
    return [`http://${env.HOST}:${env.PORT}`];
  }
};

bootstrapServer().then(({ httpServer }) => {
  const server = httpServer.listen(env.PORT, env.HOST, () => {
    console.log(`\nStarting dungeon-revealer.

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

  const connections = new Set();
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
