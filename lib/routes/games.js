var geotrigger = require('../geotrigger-helper');
var debug = require('../debug');
var Terraformer = require('Terraformer');
var geo = require('../geo');

function games (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  geotrigger.new_app_session(function(session){
    session.get_triggers_for_tag("board", function(err, data){
      var games = [];

      if(data) {
        for(var i in data) {
          (function(i){
            var e = data[i];

            var user_location = null;
            if(request.query && request.query.longitude) {
              user_location = new Terraformer.Point([request.query.longitude, request.query.latitude]);
            }

            var shape = geo.create_polygon_from_geo_condition(e.condition.geo, user_location);

            // Find the tag matching "board:id"
            var board_id = geotrigger.find_id_in_tags(e.tags, "board");
            var board = {
              board_id: board_id,
              name: (e.properties.title || "Untitled Board"),
              bbox: (shape.polygon ? shape.polygon.bbox() : null)
            };
            if(user_location) {
              distance: shape.distance;
            }
            session.redis.game.get_game_id(board_id, function(err, game_id){
              session.redis.game.get_stats(game_id, function(err, stats){
                if(game_id) {
                  board.game = {
                    game_id: game_id,
                    red_team: stats.red.num_players,
                    blue_team: stats.blue.num_players,
                    red_score: stats.red.score,
                    blue_score: stats.blue.score,
                    active: stats.active
                  };
                  games.push(board);
                }

                // On the last board, return the results
                if(i == data.length-1) {
                  response.end(JSON.stringify({"games":games}));
                }
              });

            });
          })(i);
        }
      }
    });
  });
}

module.exports = exports = games;