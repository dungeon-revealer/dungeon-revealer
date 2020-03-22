/**
 * create-react-app websocket proxy for development
 */
const proxy = require("http-proxy-middleware");

module.exports = function(app) {
  app.use(proxy("/socket.io", { target: "ws://localhost:3000", ws: true }));
  app.use(proxy("/active-map", { target: "http://localhost:3000" }));
  app.use(proxy("/map", { target: "http://localhost:3000" }));
  app.use(proxy("/map/**", { target: "http://localhost:3000" }));
  app.use(proxy("/notes**", { target: "http://localhost:3000" }));
  app.use(proxy("/notes/**", { target: "http://localhost:3000" }));
  app.use(proxy("/auth", { target: "http://localhost:3000" }));
};
