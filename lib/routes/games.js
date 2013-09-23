var geotrigger = require('../geotrigger-helper');
var debug = require('../debug');

function games (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  debug('game', "Looking for games near "+request.query.latitude+","+request.query.longitude);

  if(request.query.latitude == null) {
    response.end(JSON.stringify({"games":[]}));
  } else {
    geotrigger.new_session(request.query.access_token, response, function(session){
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

        response.end(JSON.stringify({"games":games}));
      });
    });
  }
}

module.exports = exports = games;