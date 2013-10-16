var geotrigger = require('../geotrigger-helper');
var debug = require('../debug');
var geo = require('../geo');

function game_create (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  if(request.query.board_id == null) {
    response.end(JSON.stringify({"error":"missing board_id parameter"}));
  } else {
    geotrigger.new_session(request.query.access_token, response, function(session){
      try {
        // TODO: if a game was recently created from this board (5 minutes?), return an error and the existing game ID

        var game_id = geotrigger.generate_id(16);
        var board_id = request.query.board_id;

        debug('game', "Creating game "+game_id+" from board "+board_id);

        // Save the board ID and game ID links
        session.redis.game.set_board_id(game_id, board_id, function(err, r){});

        save_game_info(board_id, game_id, session, function(err){
          if(err) {
            response.end(JSON.stringify({"error":"There was a problem", details: err}));
          } else {
            copy_game_coins(board_id, game_id, session, function(err){
              if(err) {
                response.end(JSON.stringify({"error":"There was a problem", details: err}));
              } else {
                add_device_to_game(board_id, game_id, session, function(err, team){
                  if(err) {
                    response.end(JSON.stringify({"error":"There was a problem", details: err}));
                  } else {
                    response.end(JSON.stringify({
                      game_id: game_id,
                      team: team
                    }));
                  }
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

function save_game_info(board_id, game_id, session, callback) {
  // Save the bounding box and game name to Redis
  session.get_triggers_for_tag("board:"+board_id, function(err, boards){
    if(err || boards == null || boards.length == 0) {
      callback("No board found for game: "+game_id);
    } else {
      debug('game', "Found game '"+boards[0].properties.title+"' (board "+board_id+", game "+game_id+")");

      var shape = geo.create_polygon_from_geo_condition(boards[0].condition.geo);

      session.redis.device.get_profile(session.device_id, function(err, profile){
        session.redis.game.set_data(game_id, {
          name: boards[0].properties.title,
          bbox: shape.polygon.bbox(),
          creator: {
            device_id: session.device_id,
            name: profile.name
          }
        }, function(err, data){
          callback(err, data);
        });

      });
    }
  });
}

function copy_game_coins(board_id, game_id, session, callback) {
  // Copy all the coins to Redis
  session.get_triggers_for_tag("coin:board:"+board_id, function(err, triggers){
    debug('game', "Found "+triggers.length+" coins on game "+game_id);
    for(var i in triggers) {
      var trigger = triggers[i];
      session.redis.game.set_coin_data(game_id, trigger.triggerId, {
        latitude: trigger.condition.geo.latitude,
        longitude: trigger.condition.geo.longitude,
        value: parseInt(trigger.properties.value)
      }, function(err, data){
      });
    }
    callback(err);
  });
}

function add_device_to_game(board_id, game_id, session, callback) {
  // Assign this device to a team and have them join the team
  session.redis.game.choose_team_for_device(session.device_id, game_id, function(err, team){
    // Join the device to the game
    session.device_update({
      setTags: "game:"+game_id,
    }, function(err, data){
      if(err) {
        debug('game', "Error joining game");
        debug('game', err);
        callback(err);
      } else {
        debug('game', "Device "+session.device_id+" joined game "+game_id+" on the "+team+" team");
        session.redis.device.set_active_game(session.device_id, game_id, team, function(err,response){
          callback(err, team);
        });
      }
    });
  });
}

module.exports = exports = game_create;