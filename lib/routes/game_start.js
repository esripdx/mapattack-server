var geotrigger = require('../geotrigger-helper');
var debug = require('../debug');

function game_start (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  if(request.query.game_id == null || request.query.game_id == '') {
    response.end(JSON.stringify({"error":"missing game_id parameter"}));
  } else {
    geotrigger.new_session(request.query.access_token, response, function(session){
      try {
        var game_id = geotrigger.generate_id(16);

        debug('game', "Starting game "+request.query.game_id);

        // Find the board ID for the game
        session.get_triggers_for_tag("game:"+request.query.game_id, function(err, triggers){
          if(err || triggers == null || triggers.length == 0) {
            debug('game', "Error finding board_id from game_id");
            response.end(JSON.stringify({"error":"server_error"}));
          } else {
            var board_id = geotrigger.find_id_in_tags(triggers[0].tags, "board");

            debug('game', "Setting the game_id on all triggers for board_id: "+board_id);
            session.trigger_update({
              tags: "coin:board:"+board_id,
              addTags: "coin:game:"+game_id
            }, function(err, data){
              if(err) {
                debug('game', err.parameters);
              } 
              response.end(JSON.stringify({
                "game_id": game_id
              }));
            });
          }
        });
      } catch(e) {
        response.end(JSON.stringify({"error":e.message}));
      }
    });
  }
}

module.exports = exports = game_start;