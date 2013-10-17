var geotrigger = require('../geotrigger-helper');
var debug = require('../debug');

function game_end (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  if(request.query.game_id == null || request.query.game_id == '') {
    response.end(JSON.stringify({"error":"missing game_id parameter"}));
  } else {
    geotrigger.new_app_session(function(session){
      try {
        debug('game', "Ending game "+request.query.game_id);

        // Remove redis keys linking the game and board
        session.redis.game.remove_game(request.query.game_id, function(err, r){});

        // Remove the game tag from all devices in the game
        session.device_update({
          tags: "game:"+request.query.game_id,
          removeTags: "game:"+request.query.game_id
        }, function(err, data){
          response.end(JSON.stringify({
            "result": "ended"
          }));
        });

        // Remove the game tag from all the triggers
        session.trigger_update({
          tags: "game:"+request.query.game_id,
          removeTags: "game:"+request.query.game_id
        }, function(err, data){
          session.redis.publish_game_end(request.query.game_id, function(err, data){});

          response.end(JSON.stringify({
            "result": "ended"
          }));
        });
      } catch(e) {
        response.end(JSON.stringify({"error":e.message}));
      }
    });
  }
}

module.exports = exports = game_end;