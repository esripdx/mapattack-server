var geotrigger = require('../geotrigger-helper');
var Terraformer = require('Terraformer');
var debug = require('../debug');

function board_state (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  // TODO: Check for board_id parameter
  var board_id = request.query.board_id;

  geotrigger.new_session(request.query.access_token, response, function(session){
    try {
      // Get bounding box for the board
      session.get_triggers_for_tag("board:"+board_id, function(err, boards){
        debug('board', "Found board '"+boards[0].properties.title+"' ("+board_id+")");

        var polygon = new Terraformer.Polygon(boards[0].condition.geo.geojson);
        var board = {
          board_id: board_id,
          name: (boards[0].properties.title || "Untitled Board"),
          bbox: polygon.bbox()
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

          response.end(JSON.stringify({
            board: board,
            coins: coins
          }));

        });
      });

    } catch(e) {
      console.log(e);
      response.end(JSON.stringify({"error": e}));      
    }
  });
}

module.exports = exports = board_state;