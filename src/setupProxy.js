/**
 * create-react-app websocket proxy for development
 */
const proxy = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(proxy("/api/socket.io", { target: "ws://localhost:3000", ws: true }));
  app.use(proxy("/api", { target: "http://localhost:3000" }));
  app.use(proxy("/files", { target: "http://localhost:3000" }));
};
