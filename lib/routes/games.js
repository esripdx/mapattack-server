var geotrigger = require('../geotrigger-wrapper');

function games (request, response) {
  
  geotrigger.get_tokens(request.query.device_id, function(err, tokens){

    if(request.query.latitude == null) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({"games":[]}));
    } else {
      geotrigger.get_triggers_for_tag(request.query.device_id, tokens, "game", {
        latitude: request.query.latitude,
        longitude: request.query.longitude,
        distance: 200
      }, function(err, data){
        var games = [];

        if(data) {
          games = data;
        }

        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({"games":games}));
      });
    }
  });
}

module.exports = exports = games;