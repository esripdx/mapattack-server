var Redis = require('redis'),
   config = require('../config.json');

var redis = Redis.createClient(config.redis_port, config.redis_host);


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
          callback("No access token or refresh token found");
        }
      } catch(e) {
        callback("Error parsing JSON");
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
  get_device_location(device_id, function(err, previous_location){
    if(err) {
      callback(err);
    } else {
      // Don't set the location to an older value
      if(previous_location == null || parseInt(previous_location.timestamp) < parseInt(data.timestamp)) {
        redis.set("device:location:"+device_id, JSON.stringify(data), function(err, data){
          callback(err, data);
        });
      } else {
        callback(null, false);
      }
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
  // Remove from the previously active game
  get_active_game(device_id, function(err, previous){
    if(previous) {
      redis.srem("game:"+previous.game_id+":"+previous.team+":members", device_id);
    }

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

  });
}

function get_active_game(device_id, callback) {
  redis.get("device:active_game:"+device_id, function(err, data){
    if(err) {
      callback(err);
    } else {
      data = JSON.parse(data);
      if(data == null) {
        data = {
          game_id: "",
          team: ""
        }
      }
      redis.multi()
        .hget("game:"+data.game_id+":"+data.team, "device:"+device_id)
        .get("device:profile:"+device_id)
        .exec(function(err, responses){
          if(err) {
            callback(err);
          } else {
            var profile = JSON.parse(responses[1]);
            callback(null, {
              game_id: data.game_id,
              device_team: data.team,
              device_score: parseInt(responses[0]),
              device_name: profile.name
            });
          }
        });
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

function get_team_for_coin(game_id, coin_id, callback) {
  redis.hget("game:"+game_id+":coins", coin_id, function(err, data) {
    if(err) {
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

function set_coin_ownership(device_id, game_id, coin_id, points, callback) {
  get_team_for_coin(game_id, coin_id, function(err, coin_owner) {
    if (err) {
      callback(err);
    } else {
      if (coin_owner != null) {
        callback("Coin has already been claimed: " + typeof coin_owner);
      } else {

        get_device_team(device_id, function(err, team) {
          
          if (err) {
            callback(err);
          } else if (team == null) {
            callback('ENOTEAM');
          } else {

            redis.multi()
              .hincrby("game:"+game_id+":"+team, "device:"+device_id, points)
              .hset("game:"+game_id+":coins", coin_id, team)
              .exec(function(err, replies) {
                  callback(err,team);
              });

          }
        });
      }
    }
  });

}

function get_coin_states(game_id, callback) {
  redis.hgetall("game:"+game_id+":coins", function(err, states){
    if(err){
      callback(err);
    } else {
      callback(null, states);
    }
  });
}

function get_game_data(game_id, callback) {
  redis.get("game:"+game_id+":data", function(err, data){
    if(err){
      callback(err, null);
    } else {
      callback(null, JSON.parse(data));
    }    
  });
}

function set_game_data(game_id, data, callback) {
  redis.set("game:"+game_id+":data", JSON.stringify(data), callback);
}

function get_coin_data(game_id, coin_id, callback) {
  redis.hget("game:"+game_id+":coin_data", coin_id, function(err, data){
    if(err){
      callback(err, null);
    } else {
      callback(null, JSON.parse(data));
    }
  });
}

function get_coins(game_id, callback) {
  redis.hgetall("game:"+game_id+":coin_data", function(err, data){
    callback(err, data);
  });
}

function set_coin_data(game_id, coin_id, data, callback) {
  redis.hset("game:"+game_id+":coin_data", coin_id, JSON.stringify(data), callback);
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
            redis.set("device:team:"+device_id, team, function(err,data){
              callback(null, team);
            });
          }
        });
      }
    }
  })
}

function get_scores(device_id, callback) {

  get_active_game(device_id, function(err, vals) {
    if (err) {
      callback(err);
    } else if (vals == null) {
      callback('ENOSCORE');
    } else {
      var game_id = vals.game_id;
      var team = vals.device_team;
      var device_score = vals.device_score;

      redis.multi()
        .hvals("game:"+game_id+":red")
        .hvals("game:"+game_id+":blue")
        .exec(function(err, replies) {
          if (err) {
            callback(err);
          } else {
            var red_score = sum_array(replies[0]);
            var blue_score = sum_array(replies[1]);
            callback(null, {
              player_score: device_score,
              red_score: red_score, 
              blue_score: blue_score
            });
          }
        });
    }
  });
}

function get_all_scores(game_id, callback) {
  // Return a hash of all device IDs and their corresponding scores
  // {
  //   "deviceXXX": 300,
  //   "deviceYYY": 360
  // }
  redis.multi()
    .hgetall("game:"+game_id+":blue")
    .hgetall("game:"+game_id+":red")
    .exec(function(err, replies){
      if(err) {
        callback(err, null);
      } else {
        var response = {};
        for(var j=0; j<=1; j++) {
          for(var i in replies[j]) {
            var match = i.match(/device:(.+)/)
            response[match[1]] = parseInt(replies[j][i]);
          }
        }
        callback(null, response);
      }
    });
}

function get_game_stats(game_id, callback) {
  redis.multi()
    .hvals("game:"+game_id+":red")
    .hvals("game:"+game_id+":blue")
    .scard("game:"+game_id+":red:members")
    .scard("game:"+game_id+":blue:members")
    .get("game:"+game_id+":active")
    .exec(function(err, replies){
      if(err) {
        callback(err, null);
      } else {
        callback(null, {
          red: {
            score: sum_array(replies[0]),
            num_players: replies[2]
          }, 
          blue: {
            score: sum_array(replies[1]),
            num_players: replies[3]
          },
          active: (replies[4] == 1)
        });
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

function remove_game(game_id, callback) {
  get_board_id_for_game(game_id, function(err, board_id){
    redis.multi()
      .del("board:"+board_id+":game")
      .del("game:"+game_id+":active")
      .exec(function(err, responses){
        if(callback) {
          callback(err, board_id);
        }
      });
  });
}

function set_game_active(game_id, callback) {
  redis.set("game:"+game_id+":active", 1, function(err, response){
    if(callback) {
      callback(err, response);
    }
  })
}

function is_game_active(game_id, callback) {
  redis.get("game:"+game_id+":active", function(err, response){
    callback(err, response == 1);
  })
}

function get_all_player_data(device_ids, callback) {
  var multi = redis.multi();
  for(var i in device_ids) {
    multi = multi.get("device:location:"+device_ids[i]);
    multi = multi.get("device:profile:"+device_ids[i]);
  }
  var response = {};
  multi.exec(function(err, responses){
    if(err) {
      callback(err, null);
    } else {
      for(var i in device_ids) {
        response[device_ids[i]] = {
          location: JSON.parse(responses[i*2]),
          profile: JSON.parse(responses[i*2+1])
        };
      }
      callback(err, response);
    }
  });
}

function get_app_token(callback) {
  redis.get("app_token", function(err, token){
    callback(err, token);
  });
}

function set_app_token(access_token, exp, callback) {
  redis.setex("app_token", Math.round(parseInt(exp)*0.9), access_token, function(err, data){
    callback(err, data);
  });
}


function publish_location(device_id, game_id, params, callback) {
  redis.publish("game:"+game_id, JSON.stringify({
    type: "player",
    name: params.name,
    team: params.team,
    score: params.score,
    device_id: device_id,
    latitude: params.latitude,
    longitude: params.longitude,
    timestamp: params.timestamp,
    speed: params.speed,
    bearing: params.bearing,
    accuracy: params.accuracy
  }), callback);
}

function publish_coin(game_id, params, callback) {
  redis.publish("game:"+game_id, JSON.stringify({
    type: "coin",
    coin_id: params.coin_id,
    latitude: params.latitude,
    longitude: params.longitude,
    timestamp: params.timestamp,
    team: params.team,
    value: params.value,
    device_id: params.device_id,
    player_score: params.player_score,
    red_score: params.red_score,
    blue_score: params.blue_score
  }), callback);
}

function publish_game_start(game_id, callback) {
  redis.publish("game:"+game_id, JSON.stringify({
    type: "game_start",
    game_id: game_id
  }), callback);
}

function publish_game_end(game_id, callback) {
  redis.publish("game:"+game_id, JSON.stringify({
    type: "game_end",
    game_id: game_id
  }), callback);
}

function publish_player_join(device_id, game_id, params, callback) {
  redis.publish("game:"+game_id, JSON.stringify({
    type: "player_join",
    name: params.name,
    team: params.team,
    device_id: device_id
  }), callback);
}


function sum_array(arry) {
  return arry.map(function(v){ return parseInt(v)}).reduce(function(a,b){return a+b}, 0)
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
  get_data: get_game_data,
  set_data: set_game_data,
  get_team_for_coin: get_team_for_coin,
  set_coin_ownership: set_coin_ownership,
  choose_team_for_device: choose_team_for_device,
  get_players: get_players,
  get_team_counts: get_team_counts,
  get_board_id: get_board_id_for_game,
  get_game_id: get_game_id_for_board,
  set_board_id: set_board_id_for_game,
  remove_game: remove_game,
  get_scores: get_scores,
  get_coin_states: get_coin_states,
  get_coin_data: get_coin_data,
  set_coin_data: set_coin_data,
  get_coins: get_coins,
  get_all_player_data: get_all_player_data,
  get_all_scores: get_all_scores,
  get_stats: get_game_stats,
  set_active: set_game_active,
  is_active: is_game_active
}

exports.publish_location = publish_location;
exports.publish_coin = publish_coin;
exports.publish_game_start = publish_game_start;
exports.publish_game_end = publish_game_end;
exports.publish_player_join = publish_player_join;
exports.get_app_token = get_app_token;
exports.set_app_token = set_app_token;
