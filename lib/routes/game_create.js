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

        // Save the board ID and game ID links
        session.redis.game.set_board_id(game_id, request.query.board_id, function(err, r){});

        // Assign this device to a team and have them join the team
        session.redis.game.choose_team_for_device(session.device_id, game_id, function(err, team){

          // Join the device to the game
          session.device_update({
            setTags: "game:"+game_id,
          }, function(err, data){
            if(err) {
              debug('game', "Error joining game");
              debug('game', err);
              response.end(JSON.stringify({"error":"error joining game"}));
            } else {
              debug('game', "Device "+session.device_id+" joined game "+game_id+" on the "+team+" team");
              session.redis.device.set_active_game(session.device_id, game_id, team, function(err,response){});
              response.end(JSON.stringify({
                game_id: game_id,
                team: team
              }));
            }
          });

        });
      } catch(e) {
        response.end(JSON.stringify({"error":e.message}));
      }
    });
  }
}

module.exports = exports = game_create;