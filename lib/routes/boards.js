var geotrigger = require('../geotrigger-helper');
var debug = require('../debug');
var Terraformer = require('Terraformer');
var geo = require('../geo');

function boards (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  if(request.query.latitude == null) {
    response.end(JSON.stringify({"boards":[]}));
  } else {
    geotrigger.new_session(request.query.access_token, response, function(session){
      session.get_nearby_triggers_for_tag("board", {
        latitude: request.query.latitude,
        longitude: request.query.longitude,
        distance: 1000
      }, function(err, data){
        var boards = [];

        if(data) {
          data.forEach(function(e){
            var user_location = new Terraformer.Point([request.query.longitude, request.query.latitude]);

            var shape = geo.create_polygon_from_geo_condition(e.condition.geo, user_location);

            // Find the tag matching "board:id"
            var board_id = geotrigger.find_id_in_tags(e.tags, "board");
            var board = {
              board_id: board_id,
              name: (e.properties.title || "Untitled Board"),
              distance: shape.distance,
              bbox: shape.polygon.bbox()
            };
            var game_id = geotrigger.find_id_in_tags(e.tags, "game");
            if(game_id) {
              board.game = {
                game_id: game_id,
                red_team: 8,
                blue_team: 7,
                red_score: 100,
                blue_score: 100
              };
            }

            boards.push(board);
          })
        }

        response.end(JSON.stringify({"boards":boards}));
      });
    });
  }
}

module.exports = exports = boards;