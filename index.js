var udp = require('./lib/udp'),
    web    = require('./lib/web'),
    config = require('./config.json'),
    Redis  = require('redis'),
    argv   = require('optimist').argv;

var qs  = require('querystring');

var geotrigger = require('./lib/geotrigger-helper');
var redis = require('./lib/redis');
var stats = require('./lib/stats');
var Terraformer = require('Terraformer');
var geo = require('./lib/geo');
var debug = require('./lib/debug');


var redis_pool = {};


function start_game_listener(game_id, udp_server) {
  debug('udp', "Starting new game listener for game:"+game_id);
  var redis_sub = Redis.createClient(config.redis_port, config.redis_host);
  redis_sub.subscribe("game:"+game_id, function(err,data){
    redis_sub.on("message", function(channel, message){
      debug('udp', "game:"+game_id, message);

      // Find all active players of this game
      redis.game.get_players(game_id, function(err, teams){
        debug('udp', "Active Players");
        debug('udp', teams);

        var players = [];
        teams.red.forEach(function(p){
          players.push(p);
        });
        teams.blue.forEach(function(p){
          players.push(p);
        });

        players.forEach(function(device_id){
          // Look up the UDP info for each player and send the payload to them
          redis.device.get_udp_info(device_id, function(err, udp_info){
            if(err || udp_info == null){
            } else {
              stats.udp_out(1);
              udp_server.send(new Buffer(message), 0, message.length, udp_info.port, udp_info.address, function (err, data) {
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


if(argv.udp) {

// create the UDP socket and respond
udp.createSocket(argv.udp, function (err, server) {
  debug('udp', "listening on UDP port " + config.udp_port);
  server.on("message", function (msg, rinfo) {
    try {
      var request;
      try {
        request = JSON.parse(msg);
      } catch(e) {
        debug('udp', ""+msg);
        throw "Error parsing JSON!";
      }

      debug('udp', "Got UDP Packet");
      debug('udp', request);

      if (typeof request !== 'object'
        || typeof request.access_token !== 'string'
      ) {
        debug('udp', "Invalid Packet from " + rinfo.host);
        return;
      }

      var accuracy = parseInt(request.accuracy);
      if(accuracy <= 30) {
        // Force semi-accurate locations to a 5m accuracy to hopefully force the triggers to run
        accuracy = 5;
      }

      var locationUpdate = {
        locations: [
          {
            timestamp: parseInt(request.timestamp),
            latitude:  parseFloat(request.latitude),
            longitude: parseFloat(request.longitude),
            accuracy:  accuracy,
            speed:     parseInt(request.speed),
            bearing:   parseInt(request.bearing)
          }
        ]
      };

      geotrigger.new_session(request.access_token, null, function(session){
        if(!session) {
          return;
        }
        try {
          debug('udp', "server got: a message from " + rinfo.address + ":" + rinfo.port + " [" + request.latitude + "," + request.longitude + "]");
          stats.udp_in(1);

          // Update the UDP address/port in redis for this user
          session.set_udp_info(rinfo.address, rinfo.port);

          var previous_location;
          session.redis.device.get_location(session.device_id, function(err, previous){

            var send_to_geotrigger = false;
            var distance = false;
            if(previous) {
              locationUpdate.previous = {
                timestamp: parseInt(previous.timestamp),
                latitude:  parseFloat(previous.latitude),
                longitude: parseFloat(previous.longitude),
                accuracy:  parseInt(previous.accuracy),
                speed:     parseInt(previous.speed),
                bearing:   parseInt(previous.bearing)
              };
              var p1 = new Terraformer.Point([locationUpdate.previous.longitude, locationUpdate.previous.latitude]);
              var p2 = new Terraformer.Point([locationUpdate.locations[0].longitude, locationUpdate.locations[0].latitude]);
              if((distance=geo.gc_distance(p1, p2)) >= 10) {
                send_to_geotrigger = true;
              }
            } else {
              send_to_geotrigger = true;
            }

            if(send_to_geotrigger) {
              debug('udp', "Sending location update! (distance was "+distance+")");
              // Send location update to the Geotrigger API
              session.send_location_update(locationUpdate, function (err, res) {
                if (err) {
                  debug('udp', "ERROR: " + err);
                } else {
                  debug('udp', res);
                }
              });

              // Store the location of the player in redis
              session.redis.device.set_location(session.device_id, {
                timestamp: parseInt(request.timestamp),
                latitude: parseFloat(request.latitude),
                longitude: parseFloat(request.longitude),
                speed: parseInt(request.speed),
                bearing: parseInt(request.bearing),
                accuracy: accuracy
              }, function(err,data){});

            } else {
              debug('udp', "Not sending location update (distance was "+distance+")");
            }

          });

          // Find the active game_id for the user (also includes device name, team and score)
          session.redis.device.get_active_game(session.device_id, function(err, game){
            if(err) {
              debug('udp', "Couldn't find active game for device: " + device_id);
            } else {

              // Make sure there is already a Redis listener active for this game, and if not, start one
              if(redis_pool[game.game_id]) {

              } else {
                redis_pool[game.game_id] = start_game_listener(game.game_id, server);
              }

              // Publish this user's location data to the redis channel for the game ID
              session.redis.publish_location(session.device_id, game.game_id, {
                name: (game.device_name || session.device_id.substring(0,3)),
                team: game.device_team,
                score: (game.device_score | 0),
                latitude: parseFloat(request.latitude),
                longitude: parseFloat(request.longitude),
                timestamp: parseInt(request.timestamp),
                speed: parseInt(request.speed),
                bearing: parseInt(request.bearing),
                accuracy: accuracy
              });
            }
          });

        } catch(e) {
          debug('udp', "Error");
          debug('udp', e);
        }
      });    
    } catch(e) {
      debug('udp', "Exception");
      debug('udp', e);
    }
  });
});

}


if(argv.http) {

// create the HTTP server and respond
web.createWebServer(argv.http, function (err, server) {
  console.log("listening on TCP port " + argv.http);
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

}

function processRequest(request, response) {
    var log_request = false;
    if (request.url === "/ping") {
      require('./lib/routes/ping')(request, response);

    } else if (request.url === "/device/register") {
      require('./lib/routes/device_register')(request, response);

    } else if (request.url === "/device/register_push") {
      require('./lib/routes/device_register_push')(request, response);

    } else if (request.url === "/device/info") {
      // Returns the device ID given an access token. For debugging purposes.
      require('./lib/routes/device')(request, response);

    } else if (request.url === "/board/list" || request.url === "/boards") {
      require('./lib/routes/boards')(request, response);

    } else if (request.url === "/board/new") {
      require('./lib/routes/board_new')(request, response);

    } else if (request.url === "/board/state") {
      require('./lib/routes/board_state')(request, response);

    // } else if (request.url === "/board/unpublish") {
    //   require('./lib/routes/board_unpublish')(request, response);

    } else if (request.url === "/game/list") {
      require('./lib/routes/games')(request, response);

    } else if (request.url === "/game/create") {
      require('./lib/routes/game_create')(request, response);

    } else if (request.url === "/game/start") {
      require('./lib/routes/game_start')(request, response);

    } else if (request.url === "/game/join") {
      require('./lib/routes/game_join')(request, response);

    } else if (request.url === "/game/state") {
      require('./lib/routes/game_state')(request, response);
      log_request = true;

    } else if (request.url === "/game/end") {
      require('./lib/routes/game_end')(request, response);

    } else if (request.url === "/trigger/callback") {
      require('./lib/routes/trigger_callback')(request, response);
      log_request = true;

    } else if (match=request.url.match(/\/(user|avatar)\/(.+)\.jpg/)) {
      // Return a user's avatar given their device_id
      require('./lib/routes/device_avatar')(match[2], request, response);

    } else if (request.url === "/munin/config") {
      require('./lib/stats.js').munin_config(request, response);

    } else if (request.url === "/munin/stats") {
      require('./lib/stats.js').munin_stats(request, response);

    } else {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end("not found");
    }

    if(log_request) {
      stats.http_incr(request.url);
    }
}


/*




*/

if(argv.socketio) {
  console.log("listening on socket.io port " + argv.socketio);
  var io = require('socket.io').listen(argv.socketio);
  io.enable('browser client minification');  // send minified client
  io.enable('browser client etag');          // apply etag caching logic based on version number
  io.enable('browser client gzip');          // gzip the file

  io.sockets.on('connection', function (socket) {
    var redis_sub = Redis.createClient(config.redis_port, config.redis_host);
    stats.socketio_clients_incr();

    // Prompt the client for a game ID
    socket.emit('game_id');

    // When a game ID is received, subscribe to the corresponding redis channel
    socket.on('game_id', function(game_id){

      redis_sub.subscribe("game:"+game_id, function(err,data){
        redis_sub.on("message", function(channel, message){
          debug('socketio', "game:"+game_id, message);
          // Send the message from redis to the socket.io client
          socket.emit('data', message);
          stats.socketio_out(1);
        });
      });

      // Clean up connections
      socket.on('disconnect', function(){
        stats.socketio_clients_decr();
        if(redis_sub) {
          redis_sub.unsubscribe();
          redis_sub.end();
        }
      });
      socket.on('end', function(){
        if(redis_sub) {
          redis_sub.unsubscribe();
          redis_sub.end();
        }
      });

    });

  });

}

