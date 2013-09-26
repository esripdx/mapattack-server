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

function get_active_game(device_id, callback) {
  redis.get("device:active_game:"+device_id, function(err, data){
    if(err) {
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

function set_active_game(device_id, game_id, callback) {
  redis.set("device:active_game:"+device_id, game_id, function(err, data){
    if(err) {
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

function add_device_to_game(device_id, game_id, callback) {
  redis.sadd("game:players:"+game_id, device_id, callback);
}

function remove_device_from_game(device_id, game_id, callback) {
  redis.srem("game:players:"+game_id, device_id, callback);
}

function get_players(game_id, callback) {
  redis.smembers("game:players:"+game_id, callback);
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

exports.device = {
  set_tokens: set_device_tokens,
  get_tokens: get_device_tokens,
  set_profile: set_device_profile,
  get_profile: get_device_profile,
  set_active_game: set_active_game,
  get_active_game: get_active_game,
  add_device_to_game: add_device_to_game,
  remove_device_from_game: remove_device_from_game,
  set_udp_info: set_udp_info,
  get_udp_info: get_udp_info
}

exports.publish_location = publish_location;
exports.get_players = get_players;