"use strict";

require("debug")("dungeon-revealer");
const once = require("lodash/once");
const flatMap = require("lodash/flatMap");
const { bootstrapServer } = require("./server");
const os = require("os");
const { getEnv } = require("./env");

const env = getEnv(process.env);

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

bootstrapServer(env).then(({ httpServer }) => {
  const server = httpServer.listen(env.PORT, env.HOST, () => {

    let versionString;
    if (env.VERSION.status === 'release') {
      versionString = env.VERSION.appversion;
    } else if (env.VERSION.status === 'development') {
      versionString = `${env.VERSION.commit}\nThis development version is ${env.VERSION.commits_ahead} commits ahead of ${env.VERSION.tag}!\n`;
    } else {
      versionString = `${env.VERSION.appversion}\nI couldn't verify the git commit of this version, but I think it's based on ${env.VERSION.appversion}.\n`;
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
