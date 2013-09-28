var socket = require('./lib/socket'),
    web    = require('./lib/web'),
    config = require('./config.json'),
    Redis  = require('redis');

var msgpack = require('msgpack'),
    geohash = require('cgeohash'),
    qs  = require('querystring');

var geotrigger = require('./lib/geotrigger-helper');
var redis = require('./lib/redis');
var debug = require('./lib/debug');


var redis_pool = {};



function start_game_listener(game_id, udp_server) {
  console.log("Starting new game listener for game:"+game_id);
  var redis_sub = Redis.createClient(config.redis_port, config.redis_host);
  redis_sub.subscribe("game:"+game_id, function(err,data){
    redis_sub.on("message", function(channel, message){
      console.log("game:"+game_id, message);
      // Find all active players of this game

      redis.game.get_players(game_id, function(err, teams){
        console.log("Active Players");
        console.log(teams);

        var players = [];
        teams.red.forEach(function(p){
          players.push(p);
        });
        teams.blue.forEach(function(p){
          players.push(p);
        });

        var response = msgpack.pack(message);

        players.forEach(function(device_id){
          // Look up the UDP info for each player and send the payload to them
          redis.device.get_udp_info(device_id, function(err, udp_info){
            if(err){
            } else {
              udp_server.send(response, 0, response.length, udp_info.port, udp_info.address, function (err, data) {
                if (err) {
                  debug('udp', "ERROR: " + err);
                } else {
                  debug('udp', "payload sent to "+udp_info.address+":"+udp_info.port);
                }
              });            
            }
          });
        });

      });
    });
  });
  return true;
}


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
        console.log("server got: a message from " + rinfo.address + ":" + rinfo.port + " [" + location.latitude + "," + location.longitude + "]");

        // Update the UDP address/port in redis for this user
        session.set_udp_info(rinfo.address, rinfo.port);

        // Store the location of the player in redis
        session.redis.device.set_location(session.device_id, {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: request.timestamp,
          speed: request.speed,
          bearing: request.bearing,
          accuracy: request.accuracy
        }, function(err,data){});

        // Find the active game_id for the user
        session.redis.device.get_active_game(session.device_id, function(err, game){
          if(err) {
            console.log("Couldn't find active game for device: " + device_id);
          } else {

            // Make sure there is already a Redis listener active for this game, and if not, start one
            if(redis_pool[game.game_id]) {

            } else {
              redis_pool[game.game_id] = start_game_listener(game.game_id, server);
            }

            // Publish this user's location data to the redis channel for the game ID
            session.redis.publish_location(session.device_id, game.game_id, {
              location: request.location,
              timestamp: request.timestamp,
              speed: request.speed,
              bearing: request.bearing,
              accuracy: request.accuracy
            });

          }
        });

        // Send location update to the Geotrigger API
        session.send_location_update(locationUpdate, function (err, res) {
          if (err) {
            console.error("ERROR: " + err);
          } else {
            console.log(res);
          }
        });

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
      require('./lib/routes/device_register')(request, response);

    } else if (request.url === "/device/register_push") {
      // COMPLETE
      require('./lib/routes/device_register_push')(request, response);

    } else if (request.url === "/device/info") {
      // COMPLETE
      // Returns the device ID given an access token. For debugging purposes.
      require('./lib/routes/device')(request, response);

    } else if (request.url === "/board/list" || request.url === "/boards") {
      require('./lib/routes/boards')(request, response);

    } else if (request.url === "/board/new") {
      // COMPLETE
      require('./lib/routes/board_new')(request, response);

    } else if (request.url === "/board/state") {
      // COMPLETE
      require('./lib/routes/board_state')(request, response);

    } else if (request.url === "/game/create") {
      // COMPLETE
      require('./lib/routes/game_create')(request, response);

    } else if (request.url === "/game/start") {
      require('./lib/routes/game_start')(request, response);

    } else if (request.url === "/game/join") {
      require('./lib/routes/game_join')(request, response);

    } else if (request.url === "/game/state") {
      require('./lib/routes/game_state')(request, response);

    } else if (request.url === "/game/end") {
      require('./lib/routes/game_end')(request, response);

    } else if (request.url === "/trigger/callback") {
      require('./lib/routes/trigger_callback')(request, response);

    } else if (match=request.url.match(/\/user\/(.+)\.jpg/)) {
      // Return a user's avatar given their device_id
      require('./lib/routes/device_avatar')(match[1], request, response);

    } else {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end("404 error");
    }
}
