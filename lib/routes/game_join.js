var geotrigger = require('../geotrigger-helper');
var debug = require('../debug');

function game_join (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  if(request.query.game_id == null) {
    response.end(JSON.stringify({"error":"missing game_id parameter"}));
  } else {
    var game_id = request.query.game_id;

    geotrigger.new_session(request.query.access_token, response, function(session){
      try {
        // Assign to a team
        session.redis.game.choose_team_for_device(session.device_id, game_id, function(err, team){
          if(err || team == null) {
            debug('game', "Error joining game");
            debug('game', err);
            response.end(JSON.stringify({"error":"error joining game"}));
          } else {
            session.device_update({
              setTags: "game:"+game_id,
            }, function(err, data){
              if(err) {
                debug('game', "Error joining game");
                debug('game', err);
                response.end(JSON.stringify({"error":"error joining game"}));
              } else {
                debug('game', "Device "+session.device_id+" joined game "+game_id+" on the "+team+" team");
                session.redis.device.set_active_game(session.device_id, game_id, team, function(err,response){
                  response.end(JSON.stringify({
                    game_id: game_id,
                    team: team
                  }));
                });
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

module.exports = exports = game_join;