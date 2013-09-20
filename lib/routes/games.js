var geotrigger = require('../geotrigger-helper');

function games (request, response) {

  if(request.query.latitude == null) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({"games":[]}));
  } else {
    console.log("Making authenticated_request");
    geotrigger.new_session(request.query.device_id, response, function(session){
      console.log("authenticated_request finished");
      session.get_triggers_for_tag(request.query.device_id, "game", {
        latitude: request.query.latitude,
        longitude: request.query.longitude,
        distance: 400
      }, function(err, data){
        var games = [];

        if(data) {
          games = data;
        }

        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({"games":games}));
      });
    });
  }
}

module.exports = exports = games;