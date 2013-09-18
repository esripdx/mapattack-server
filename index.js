var socket = require('./lib/socket'),
    web    = require('./lib/web'),
    config = require('./config.json');


var msgpack = require('msgpack');


socket.createSocket(config.udp_port, function (err, server) {
  server.on("message", function (msg, rinfo) {
    var decoded = msgpack.unpack(msg);
    console.log("server got: a message from " +
      rinfo.address + ":" + rinfo.port, decoded);
  });
});

web.createWebServer(config.http_port, function (err, server) {
  server.on("request", function (request, response) {
    console.log("http request: " + request.url);
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end("404 error");
  });
});