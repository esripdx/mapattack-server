var socket = require('./lib/socket'),
    web    = require('./lib/web'),
    config = require('./config.json');


var msgpack = require('msgpack'),
    geohash = require('cgeohash');

var geotriggers = require('./lib/geotriggers');


// create the UDP socket and respond
socket.createSocket(config.udp_port, function (err, server) {
  console.log("listening on UDP port " + config.udp_port);
  server.on("message", function (msg, rinfo) {
    var decoded = msgpack.unpack(msg);

    var response = msgpack.pack(decoded.timestamp);

    var location = geohash.decode(decoded.location);

    if (typeof response !== 'object') {
      console.error("Invalid Packet from " + rinfo.host);
      return;
    }

    var locationUpdate = {
      locations: [
        {
          timestamp: new Date(response.timestamp * 1000),
          latitude:  location.latitude,
          longitude: location.longitude,
          accuracy:  response.accuracy,
          speed:     response.speed,
          bearing:   response.bearing
        }
      ]
    };

    geotriggers.sendLocationUpdate(locationUpdate, function (err, res) {
      if (err) {
        console.error("ERROR: " + err);
      } else {
        console.log(res);
      }
    });

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

    } else if (request.url === "/device/register") {
      // When a device first launches the app, it will always make a request to the register endpoint
      // device_id=XXXXXXXXXXXXXXXXXXXX
      require('./lib/routes/device_register')(request, response);

    } else if (request.url === "/games") {
      // device_id=XXXXXXXXXXXXXXXXXXXX
      require('./lib/routes/games')(request, response);

    } else if (request.url === "/game/join") {
      // The device is joining an exiting game
      // device_id=XXXXXXXXXXXXXXXXXXXX
      // game_id=XXXXXXXXXXXXXXXXXXXX
      require('./lib/routes/game_join')(request, response);

    } else if (request.url === "/game/create") {
      // device_id=XXXXXXXXXXXXXXXXXXXX
      // board_id=XXXXXXXXXXXXXXXXXXXX
      require('./lib/routes/game_create')(request, response);

    } else if (request.url === "/game/state") {
      // device_id=XXXXXXXXXXXXXXXXXXXX
      // game_id=XXXXXXXXXXXXXXXXXXXX
      require('./lib/routes/game_state')(request, response);

    } else {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end("404 error");
    }
  });
});