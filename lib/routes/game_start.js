var geotrigger = require('../geotrigger-helper');
var debug = require('../debug');
var config = require('../../config.json');

function game_start (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  if(request.query.game_id == null || request.query.game_id == '') {
    response.end(JSON.stringify({"error":"missing game_id parameter"}));
  } else {
    geotrigger.new_session(request.query.access_token, response, function(session){
      try {
        var game_id = request.query.game_id;

        debug('game', "Starting game "+request.query.game_id);

        // Find the board ID for the game
        session.redis.game.get_board_id(game_id, function(err, board_id){
          if(err || board_id == null) {
            debug('game', "Error finding board_id from game_id");
            response.end(JSON.stringify({"error":"server_error"}));
          } else {
            debug('game', "Setting game_id="+game_id+" on all triggers for board_id: "+board_id);

            session.trigger_update({
              tags: "coin:board:"+board_id,
              addTags: "game:"+game_id,
              action: {
                notification: null,
                callbackUrl: config.callback_url
              }
            }, function(err, data){
              if(err) {
                debug('game', err.parameters);
                response.end(JSON.stringify({"error":"error starting game"}));
              } else {
                debug('game', 'Started game!');
                response.end(JSON.stringify({
                  "game_id": game_id,
                  "num_coins": data.triggers.length
                }));
              }
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