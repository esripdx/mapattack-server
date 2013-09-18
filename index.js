var socket = require('./lib/socket');

var msgpack = require('msgpack');


socket.createSocket(5309, function (err, server) {
  server.on("message", function (msg, rinfo) {
    var decoded = msgpack.unpack(msg);
    console.log("server got: a message from " +
      rinfo.address + ":" + rinfo.port, decoded);
  });
});