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
      callback(err, data);
    }
  })
}

function get_device_tokens(device_id, callback) {
  redis.get("device:tokens:"+device_id, function(err, data){
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
  })
}

function set_device_tokens(device_id, data, callback) {
  redis.set("device:tokens:"+device_id, JSON.stringify(data), function(err, data){
    if(err){
      callback(err);
    } else {
      callback(err, data);
    }
  })
}

exports.device = {
  set_tokens: set_device_tokens,
  get_tokens: get_device_tokens,
  set_profile: set_device_profile,
  get_profile: get_device_profile
}
