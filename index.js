var socket = require('./lib/socket'),
    web    = require('./lib/web'),
    config = require('./config.json');

var msgpack = require('msgpack'),
    geohash = require('cgeohash'),
    qs  = require('querystring');

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

    if (request.method === 'POST') {
      var body = '';

      request.on('data', function (data) {
        body += data;
        if(body.length > 200000) { // Limit requests to 200kb
          response.writeHead(413, { "Content-Type": "application/json" });
          response.end(JSON.stringify({"error":"request_too_large"}));
        }
      });

      request.on('end', function () {
        request.query = qs.parse(body);
        request.body = body;
        processRequest(request, response);
      });
    } else {
      processRequest(request, response);
    }
  });
});

function processRequest(request, response) {
    if (request.url === "/ping") {
      require('./lib/routes/ping')(request, response);

    } else if (request.url === "/device/register") {
      // When the user enters their name/photo, the device registers.
      // The next time the app is open, it makes a request to register with the existing name/photo stored on the device.
      // device_id=XXXXXXXXXXXXXXXXXXXX
      // name=Your Name
      // avatar=base64-encoded image
      require('./lib/routes/device_register')(request, response);

    } else if (request.url === "/boards") {
      // device_id=XXXXXXXXXXXXXXXXXXXX
      require('./lib/routes/boards')(request, response);

    } else if (request.url === "/games") {
      // device_id=XXXXXXXXXXXXXXXXXXXX
      require('./lib/routes/games')(request, response);

    } else if (request.url === "/game/join") {
      // The device is joining an existing game
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

    } else if (request.url === "/game/end") {
      // The device is joining an existing game
      // device_id=XXXXXXXXXXXXXXXXXXXX
      // game_id=XXXXXXXXXXXXXXXXXXXX
      require('./lib/routes/game_end')(request, response);

    } else {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end("404 error");
    }
}
