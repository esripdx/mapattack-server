var geotrigger = require('../geotrigger-helper');

function games (request, response) {

  if(request.query.latitude == null) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({"games":[]}));
  } else {
    geotrigger.new_session(request.query.device_id, response, function(session){
      session.get_triggers_for_tag("game", {
        latitude: request.query.latitude,
        longitude: request.query.longitude,
        distance: 400
      }, function(err, data){
        var games = [];

        if(data) {
          data.forEach(function(e){
            // Find the tag matching "game:id"
            var game_ids = geotrigger.find_ids_in_tags(e.tags, "game");
            game_ids.forEach(function(g){
              games.push({
                id: g,
                name: "game " + g
              });
            });
          })
        }

        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({"games":games}));
      });
    });
  }
}

module.exports = exports = games;