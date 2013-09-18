var socket = require('./lib/socket'),
    web    = require('./lib/web'),
    config = require('./config.json');


var msgpack = require('msgpack'),
    geohash = require('cgeohash');



// create the UDP socket and respond
socket.createSocket(config.udp_port, function (err, server) {
  console.log("listening on UDP port " + config.udp_port);
  server.on("message", function (msg, rinfo) {
    var decoded = msgpack.unpack(msg);

    var response = msgpack.pack(decoded.timestamp);

    var location = geohash.decode(decoded.location);

    console.log("server got: a message from " +
      rinfo.address + ":" + rinfo.port, decoded);
    console.log(location);

    server.send(response, 0, response.length, rinfo.port, rinfo.host, function (err, data) {
      if (err) {
        console.error("ERROR: " + err);
      } else {
        console.log("acknowledgement sent");
      }
    });
  });
});


// create the HTTP server and respond
web.createWebServer(config.http_port, function (err, server) {
  console.log("listening on TCP port " + config.http_port);
  server.on("request", function (request, response) {
    console.log("http request: " + request.url);

    if (request.url === "/ping") {
      require('./lib/routes/ping')(request, response);
    } else {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end("404 error");
    }
  });
});