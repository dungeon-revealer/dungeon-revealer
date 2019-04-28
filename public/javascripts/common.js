// Require.js settings
require.config({
  shim: {
    bootstrap: {
      deps: ["jquery"]
    }
  },
  paths: {
    jquery: "//code.jquery.com/jquery-2.1.1.min",
    bootstrap: "//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min",
    io: "//cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io",
    panzoom:
      "//cdnjs.cloudflare.com/ajax/libs/jquery.panzoom/3.2.2/jquery.panzoom.min"
  }
});
