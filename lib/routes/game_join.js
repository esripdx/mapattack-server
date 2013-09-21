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
          if(err) {
            console.log("Error joining game");
            console.log(err);
            response.end(JSON.stringify({"error":"error joining game"}));
          } else {
            session.set_active_game(request.query.game_id);
            response.end(JSON.stringify({"game_id":request.query.game_id}));
          }
        });
      } catch(e) {
        response.end(JSON.stringify({"error":e.message}));
      }
    });    
  }
}

module.exports = exports = game_join;