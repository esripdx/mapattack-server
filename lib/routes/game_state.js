var geotrigger = require('../geotrigger-helper');

function game_state (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  geotrigger.new_session(request.query.access_token, response, function(session){
    try {
      session.redis.get_players(request.query.game_id, function(err, data){
        var players = [];
        console.log("Active Players");
        console.log(data);
        players = data;
        response.end(JSON.stringify({"players": players}));
      });
    } catch(e) {
      console.log(e);
      response.end(JSON.stringify({"error": e}));      
    }
  });
}

module.exports = exports = game_state;