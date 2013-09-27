var geotrigger = require('../geotrigger-helper');
var Terraformer = require('Terraformer');
var debug = require('../debug');

function game_state (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  // TODO: Check for game_id parameter
  var game_id = request.query.game_id;

  geotrigger.new_session(request.query.access_token, response, function(session){
    try {
      // Get bounding box for the game
      session.get_triggers_for_tag("game:"+game_id, function(err, games){
        debug('game', "Found game '"+games[0].properties.title+"' ("+game_id+")");

        var polygon = new Terraformer.Polygon(games[0].condition.geo.geojson);
        var game = {
          game_id: game_id,
          name: (games[0].properties.title || "Untitled Game"),
          bbox: polygon.bbox(),
          teams: {
            blue: {
              size: 12,
              score: 200
            },
            red: {
              size: 11,
              score: 180
            }
          }
        };

        session.get_triggers_for_tag("coin:game:"+game_id, function(err, triggers){
          debug('game', "Found "+triggers.length+" coins on game "+game_id);
          var coins = [];
          for(var i in triggers) {
            var trigger = triggers[i];
            coins.push({
              coin_id: trigger.triggerId,
              latitude: trigger.condition.geo.latitude,
              longitude: trigger.condition.geo.longitude,
              value: parseInt(trigger.properties.value),
              team: "red"
            });
          }

          // TODO get list of players
          // * latitude
          // * longitude
          // * timestamp
          // * device_id
          // * speed
          // * bearing
          // * accuracy
          // * profile_url
          var players = [];
          players.push({
            device_id: "XXXXX0",
            latitude: 45.5165,
            longitude: -122.6764,
            timestamp: 1380320211,
            speed: 10,
            bearing: 180,
            accuracy: 30,
            avatar: "http://api.mapattack.org/user/XXXXXX.jpg",
            score: 190
          });

          players.push({
            device_id: "XXXXX1",
            latitude: 45.5265,
            longitude: -122.6784,
            timestamp: 1380320214,
            speed: 10,
            bearing: 180,
            accuracy: 30,
            avatar: "http://api.mapattack.org/user/XXXXXX.jpg",
            score: 170
          });

          response.end(JSON.stringify({
            game: game,
            coins: coins,
            players: players
          }));

        });
      });

    } catch(e) {
      console.log(e);
      response.end(JSON.stringify({"error": e}));      
    }
  });
}

module.exports = exports = game_state;