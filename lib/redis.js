var Redis = require('redis'),
   config = require('../config.json');

var redis = Redis.createClient(config.redis_port, config.redis_host);

/**

Device info:

AGO tokens:
* access token
* refresh token

Profile data:
* name
* avatar

Game info:
* current game ID

TODO: Maybe make a class that represents a device and handles storing everything for the device?

**/


function get_device_profile(device_id, callback) {
  redis.get("device:profile:"+device_id, function(err, data){
    if(err) {
      callback(err);
    } else {
      callback(null, JSON.parse(data));
    }
  });
}

function set_device_profile(device_id, data, callback) {
  redis.set("device:profile:"+device_id, JSON.stringify(data), function(err, data){
    if(err) {
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

function get_device_tokens(access_token, callback) {
  redis.get("device:tokens:"+access_token, function(err, data){
    if(err){
      callback(err);
    } else {
      try {
        var tokens = JSON.parse(data);
        if(tokens.access_token || tokens.refresh_token) {
          callback(null, tokens);
        } else {
          callback({error: "No access token or refresh token found"});
        }
      } catch(e) {
        callback({error: "Error parsing JSON"});
      }
    }
  });
}

function set_device_tokens(access_token, data, callback) {
  redis.set("device:tokens:"+access_token, JSON.stringify(data), function(err, data){
    if(err){
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

function get_device_location(device_id, callback) {
  redis.get("device:location:"+device_id, function(err, data){
    if(err) {
      callback(err);
    } else {
      callback(null, JSON.parse(data));
    }
  });
}

function set_device_location(device_id, data, callback) {
  redis.set("device:location:"+device_id, JSON.stringify(data), function(err, data){
    if(err) {
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

function get_device_team(device_id, callback) {
  redis.get("device:team:"+device_id, function(err, data){
    callback(err, data);
  });
}

function get_team_for_game(device_id, game_id, callback) {
  redis.multi()
    .sismember("game:"+game_id+":red:members", device_id)
    .sismember("game:"+game_id+":blue:members", device_id)
    .exec(function(err, replies){
      var team;
      if(replies[0] == 1) {
        team = "red";
      } else if(replies[1] == 1) {
        team = "blue";
      } else {
        team = null;
      }
      callback(err, team);
    });
}

function set_active_game(device_id, game_id, team, callback) {
  var otherteam;
  if(team == "red") {
    otherteam = "blue";
  } else {
    otherteam = "red";
  }

  redis.multi()
    .set("device:active_game:"+device_id, JSON.stringify({game_id: game_id, team: team}))
    .srem("game:"+game_id+":"+otherteam+":members", device_id)
    .sadd("game:"+game_id+":"+team+":members", device_id)
    .exec(function(err, replies){
      callback(err, replies);
    });
}

function get_active_game(device_id, callback) {
  redis.get("device:active_game:"+device_id, function(err, data){
    if(err) {
      callback(err);
    } else {
      callback(null, JSON.parse(data));
    }
  });
}

function set_udp_info(device_id, address, port, callback) {
  redis.set("device:udp:"+device_id, JSON.stringify({
    address: address,
    port: port
  }), function(err, data){
    if(err) {
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

function get_udp_info(device_id, callback) {
  redis.get("device:udp:"+device_id, function(err, data){
    if(err) {
      callback(err);
    } else {
      callback(null, JSON.parse(data));
    }
  });
}

function get_team_counts(game_id, callback) {
  redis.multi()
    .scard("game:"+game_id+":red:members")
    .scard("game:"+game_id+":blue:members")
    .exec(function(err, replies){
      callback(err, {
        red: replies[0],
        blue: replies[1]
      });
    });
}

function get_players(game_id, callback) {
  redis.multi()
    .smembers("game:"+game_id+":red:members")
    .smembers("game:"+game_id+":blue:members")
    .exec(function(err, replies){
      callback(err, {
        red: replies[0],
        blue: replies[1]
      });
    });
}

function publish_location(device_id, game_id, params, callback) {
  redis.publish("game:"+game_id, JSON.stringify({
    device_id: device_id,
    location: params.location,
    timestamp: params.timestamp,
    speed: params.speed,
    bearing: params.bearing,
    accuracy: params.accuracy
  }), callback);
}


function get_team_for_coin(game_id, coin_id, callback) {
  redis.hget("game:"+game_id, "coin:"+coin_id, function(err, data) {
    if(err) {
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

function set_coin_ownership(device_id, game_id, coin_id, callback) {
  get_team_for_coin(game_id, coin_id, function(err, coin_owner) {
    if (err) {
      callback(err);
    } else {
      if (coin_owner != null) {
        callback({error: "Coin has already been claimed."});
      } else {

        get_device_team(device_id, function(err, team) {
          if (err) {
            callback(err);
          } else {

            redis.multi()
              .hincrby("game:"+game_id+":"+team, "device:"+device_id, 1)
              .hset("game:"+game_id, "coin:"+coin_id, team)
              .exec(function(err, replies) {
                  callback(err,team);
              });

          }
        });
      }
    }
  });

}

// Picks a new team for a device or returns the existing team if the device was already part of the game
function choose_team_for_device(device_id, game_id, callback) {
  get_team_for_game(device_id, game_id, function(err, existing_team){
    if(err) {
      callback(err, null);
    } else {
      if(existing_team != null) {
        callback(null, existing_team);
      } else {
        // Find the number of players on each team
        get_team_counts(game_id, function(err, counts){
          if(err) {
            callback(err, null);
          } else {
            var team;
            // Assign to the team with the smaller number of players
            if(counts.red < counts.blue) {
              team = "red";
            } else {
              team = "blue";
            }
            callback(null, team);
          }
        });
      }
    }
  });
}

function set_board_id_for_game(game_id, board_id, callback) {
  redis.multi()
    .set("game:"+game_id+":board", board_id)
    .set("board:"+board_id+":game", game_id)
    .exec(function(err, response){
      callback(err, response);
    });
}

function get_board_id_for_game(game_id, callback) {
  redis.get("game:"+game_id+":board", function(err, board_id){
    callback(err, board_id);
  });
}

function get_game_id_for_board(board_id, callback) {
  redis.get("board:"+board_id+":game", function(err, game_id){
    callback(err, game_id);
  });
}

exports.device = {
  set_tokens: set_device_tokens,
  get_tokens: get_device_tokens,
  set_profile: set_device_profile,
  get_profile: get_device_profile,
  set_location: set_device_location,
  get_location: get_device_location,
  get_team_for_game: get_team_for_game,
  set_active_game: set_active_game,
  get_active_game: get_active_game,
  set_udp_info: set_udp_info,
  get_udp_info: get_udp_info
}

exports.game = {
  get_team_for_coin: get_team_for_coin,
  set_coin_ownership: set_coin_ownership,
  choose_team_for_device: choose_team_for_device,
  get_players: get_players,
  get_team_counts: get_team_counts,
  get_board_id: get_board_id_for_game,
  get_game_id: get_game_id_for_board,
  set_board_id: set_board_id_for_game,
}

exports.publish_location = publish_location;
