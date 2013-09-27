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
            var polygon = new Terraformer.Polygon(e.condition.geo.geojson);

            var distance;
            var user_location = new Terraformer.Point([request.query.longitude, request.query.latitude]);
            if(user_location.within(polygon)) {
              distance = 0;
            } else {
              debug('board', polygon.coordinates[0][0][0]);
              distance = 1000000;
              // Find the closest point
              for(var i=0; i<polygon.coordinates[0].length; i++) {
                var new_distance = Math.round(geo.gc_distance(user_location, new Terraformer.Point([polygon.coordinates[0][i][0], polygon.coordinates[0][i][1]])));
                if(new_distance < distance) {
                  distance = new_distance;
                }
              }
            }

            // Find the tag matching "board:id"
            var board_id = geotrigger.find_id_in_tags(e.tags, "board");
            var board = {
              board_id: board_id,
              name: (e.properties.title || "Untitled Board"),
              distance: distance,
              bbox: polygon.bbox()
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