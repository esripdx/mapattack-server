var geotrigger = require('../geotrigger-helper');
var Terraformer = require('Terraformer');
var debug = require('../debug');

function game_state (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  // TODO: Check for game_id parameter
  var game_id = request.query.game_id;

  geotrigger.new_session(request.query.access_token, response, function(session){
    try {
      session.redis.game.get_board_id(game_id, function(err, board_id){

        // Get bounding box for the game
        session.get_triggers_for_tag("board:"+board_id, function(err, boards){

          debug('game', "Found game '"+boards[0].properties.title+"' (board "+board_id+", game "+game_id+")");

          var polygon = new Terraformer.Polygon(boards[0].condition.geo.geojson);
          var game = {
            game_id: game_id,
            name: (boards[0].properties.title || "Untitled Game"),
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

          session.redis.game.get_coin_states(game_id, function(err, coin_states){
            debug('game', 'Coins:');
            debug('game', coin_states);

            session.get_triggers_for_tag("game:"+game_id, function(err, triggers){
              debug('game', "Found "+triggers.length+" coins on game "+game_id);
              var coins = [];
              for(var i in triggers) {
                var trigger = triggers[i];
                coins.push({
                  coin_id: trigger.triggerId,
                  latitude: trigger.condition.geo.latitude,
                  longitude: trigger.condition.geo.longitude,
                  value: parseInt(trigger.properties.value),
                  team: (coin_states[trigger.triggerId] || null)
                });
              }
              debug('game', coins);

              // TODO get list of players
              var players = [];
              players.push({
                device_id: "XXXXX0",
                name: "ABA",
                latitude: 45.5165,
                longitude: -122.6764,
                timestamp: 1380320211,
                speed: 10,
                bearing: 180,
                accuracy: 30,
                avatar: "http://api.mapattack.org/user/XXXXXX.jpg",
                score: 190,
                team: "red"
              });

              players.push({
                device_id: "XXXXX1",
                name: "PCP",
                latitude: 45.5265,
                longitude: -122.6784,
                timestamp: 1380320214,
                speed: 10,
                bearing: 180,
                accuracy: 30,
                avatar: "http://api.mapattack.org/user/XXXXXX.jpg",
                score: 170,
                team: "blue"
              });

              response.end(JSON.stringify({
                game: game,
                coins: coins,
                players: players
              }));

            });

          });
        });
      });

    } catch(e) {
      console.log(e);
      response.end(JSON.stringify({"error": e}));      
    }
  });
}

module.exports = exports = game_state;