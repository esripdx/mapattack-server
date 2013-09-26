var geotrigger = require('../geotrigger-helper');
var debug = require('../debug');

function game_create (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  if(request.query.board_id == null) {
    response.end(JSON.stringify({"error":"missing board_id parameter"}));
  } else {
    geotrigger.new_session(request.query.access_token, response, function(session){
      try {
        // TODO: if a game was recently created from this board (5 minutes?), return an error and the existing game ID

        var game_id = geotrigger.generate_id(16);

        debug('game', "Creating game "+game_id+" from board "+request.query.board_id);

        session.trigger_update({
          tags: "board:"+request.query.board_id,
          addTags: "game:"+game_id+",game"
        }, function(err, data){
          response.end(JSON.stringify({
            "game_id": game_id
          }));
        });
      } catch(e) {
        response.end(JSON.stringify({"error":e.message}));
      }
    });
  }
}

module.exports = exports = game_create;