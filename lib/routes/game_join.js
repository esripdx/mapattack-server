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

        // Check if already assigned to a team, and return that team if so
        session.redis.device.get_team_for_game(session.device_id, game_id, function(err, existing_team){

          if(existing_team != null) {
            response.end(JSON.stringify({
              game_id: game_id,
              team: existing_team
            }));
          } else {
            // Find the number of players on each team
            session.redis.get_team_counts(game_id, function(err, counts){
              debug('game', counts);

              var team;
              if(counts.red < counts.blue) {
                team = "red";
              } else {
                team = "blue";
              }

              session.device_update({
                setTags: "game:"+game_id,
              }, function(err, data){
                if(err) {
                  debug('game', "Error joining game");
                  debug('game', err);
                  response.end(JSON.stringify({"error":"error joining game"}));
                } else {
                  debug('game', "Device "+session.device_id+" joined game "+game_id+" on the "+team+" team");
                  session.redis.device.set_team(session.device_id, game_id, team, function(err,response){});
                  session.set_active_game(request.query.game_id);
                  response.end(JSON.stringify({
                    game_id: game_id,
                    team: team
                  }));
                }
              });
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