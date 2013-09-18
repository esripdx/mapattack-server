var socket = require('./lib/socket');

socket.createSocket(5309, function (err, server) {
  server.on("message", function (msg, rinfo) {
    console.log("server got: " + msg + " from " +
      rinfo.address + ":" + rinfo.port);
  });
});