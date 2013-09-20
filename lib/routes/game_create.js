var geotrigger = require('../geotrigger-helper');


function game_create (request, response) {
  if(request.query.board_id == null) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({"error":"missing board_id parameter"}));
  } else {
    geotrigger.new_session(request.query.device_id, response, function(session){
      try {
        // TODO: if a game was recently created from this board (5 minutes?), return an error and the existing game ID

        var game_id = geotrigger.generate_id(16);

        session.trigger_update({
          tags: "board:"+request.query.board_id,
          addTags: "game:"+game_id+",game"
        }, function(err, data){
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify({"game":game_id}));
        });
      } catch(e) {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({"error":e.message}));
      }
    });    
  }
}

module.exports = exports = game_create;