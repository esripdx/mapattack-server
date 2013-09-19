var geotrigger = require('../geotrigger-wrapper');

function games (request, response) {
  
  geotrigger.get_access_token(request.query.device_id, function(err, access_token){
    
    geotrigger.get_triggers_for_tag(access_token, "game", function(err, data){
      var games = [];

      if(data) {
        games = data;
      }

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({"games":games}));
    });
  });
}

module.exports = exports = games;