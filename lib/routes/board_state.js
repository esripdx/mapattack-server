var geotrigger = require('../geotrigger-helper');
var Terraformer = require('Terraformer');
var debug = require('../debug');
var geo = require('../geo');

function board_state (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  // TODO: Check for board_id parameter
  var board_id = request.query.board_id;

  geotrigger.new_session(request.query.access_token, response, function(session){
    try {
      // Get bounding box for the board
      session.get_triggers_for_tag("board:"+board_id, function(err, boards){
        if(err || boards == null || boards.length == 0) {
          response.end(JSON.stringify({
            error: "Board '"+board_id+"' not found"
          }));
        } else {
          debug('board', "Found board '"+boards[0].properties.title+"' ("+board_id+")");
          debug('board', boards[0].condition.geo);

          var shape = geo.create_polygon_from_geo_condition(boards[0].condition.geo);

          var board = {
            board_id: board_id,
            game_id: false,
            name: (boards[0].properties.title || "Untitled Board"),
            bbox: shape.polygon.bbox()
          };

          session.get_triggers_for_tag("coin:board:"+board_id, function(err, triggers){
            debug('board', "Found "+triggers.length+" coins on board "+board_id);
            var coins = [];
            for(var i in triggers) {
              var trigger = triggers[i];
              coins.push({
                coin_id: trigger.triggerId,
                latitude: trigger.condition.geo.latitude,
                longitude: trigger.condition.geo.longitude,
                value: parseInt(trigger.properties.value)
              });
            }

            session.redis.game.get_game_id(board_id, function(err, game_id){
              if(game_id) {
                board.game_id = game_id;
              }

              response.end(JSON.stringify({
                board: board,
                coins: coins
              }));
            });

          });
        }
      });

    } catch(e) {
      console.log(e);
      response.end(JSON.stringify({"error": e}));      
    }
  });
}

module.exports = exports = board_state;