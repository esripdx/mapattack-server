var geotrigger = require('../geotrigger-helper');

function game_join (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  if(request.query.game_id == null) {
    response.end(JSON.stringify({"error":"missing game_id parameter"}));
  } else {
    geotrigger.new_session(request.query.access_token, response, function(session){
      try {
        session.device_update({
          setTags: "game:"+request.query.game_id,
        }, function(err, data){
          response.end(JSON.stringify({"game_id":request.query.game_id}));
        });
      } catch(e) {
        response.end(JSON.stringify({"error":e.message}));
      }
    });    
  }
}

module.exports = exports = game_join;