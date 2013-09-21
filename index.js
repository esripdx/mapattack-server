var socket = require('./lib/socket'),
    web    = require('./lib/web'),
    config = require('./config.json');

var msgpack = require('msgpack'),
    geohash = require('cgeohash'),
    qs  = require('querystring');

var geotrigger = require('./lib/geotrigger-helper');


// create the UDP socket and respond
socket.createSocket(config.udp_port, function (err, server) {
  console.log("listening on UDP port " + config.udp_port);
  server.on("message", function (msg, rinfo) {
    var request = msgpack.unpack(msg);

    console.log("Got UDP Packet");
    console.log(request);

    var response = msgpack.pack(request.timestamp);

    var location = geohash.decode(request.location);

    if (typeof request !== 'object'
      || typeof request.access_token !== 'string'
    ) {
      console.error("Invalid Packet from " + rinfo.host);
      return;
    }

    var locationUpdate = {
      locations: [
        {
          timestamp: new Date(request.timestamp * 1000),
          latitude:  location.latitude,
          longitude: location.longitude,
          accuracy:  request.accuracy,
          speed:     request.speed,
          bearing:   request.bearing
        }
      ]
    };

    geotrigger.new_session(request.access_token, response, function(session){
      try {
        // TODO Store the UDP address/port in redis for this access token
        
        session.send_location_update(locationUpdate, function (err, res) {
          if (err) {
            console.error("ERROR: " + err);
          } else {
            console.log(res);
          }
        });

        console.log("server got: a message from " + rinfo.address + ":" + rinfo.port + " [" + location.latitude + "," + location.longitude + "]");
        /*
        server.send(response, 0, response.length, rinfo.port, rinfo.host, function (err, data) {
          if (err) {
            console.error("ERROR: " + err);
          } else {
            console.log("acknowledgement sent");
          }
        });
        */
      } catch(e) {
        console.log("Error");
        console.log(e);
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
      // COMPLETE
      // When the user enters their name/photo, the device registers.
      // The next time the app is open, it makes a request to register with the existing name/photo stored on the device.

      // Creating a new device
      // name=Your Name
      // avatar=base64-encoded image

      // Updating an existing device
      // access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
      // name=Your Name
      // avatar=base64-encoded image

      require('./lib/routes/device_register')(request, response);

    } else if (request.url === "/boards") {
      // COMPLETE
      // access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
      // latitude=XXX
      // longitude=XXX
      require('./lib/routes/boards')(request, response);

    } else if (request.url === "/games") {
      // COMPLETE
      // access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
      // latitude=XXX
      // longitude=XXX
      require('./lib/routes/games')(request, response);

    } else if (request.url === "/game/create") {
      // COMPLETE
      // Create a game given an existing board
      // access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
      // board_id=XXXXXXXXXXXXXXXXXXXX
      require('./lib/routes/game_create')(request, response);

    } else if (request.url === "/game/join") {
      // COMPLETE
      // The device is joining an existing game
      // access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
      // game_id=XXXXXXXXXXXXXXXXXXXX
      require('./lib/routes/game_join')(request, response);

    } else if (request.url === "/game/state") {
      // access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
      // game_id=XXXXXXXXXXXXXXXXXXXX
      require('./lib/routes/game_state')(request, response);

    } else if (request.url === "/game/end") {
      // The device is joining an existing game
      // access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
      // game_id=XXXXXXXXXXXXXXXXXXXX
      require('./lib/routes/game_end')(request, response);

    } else if (request.url.match(/\/user\/(.+)\.jpg/)) {
      // Return a user's avatar given their device_id

    } else {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end("404 error");
    }
}
