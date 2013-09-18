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

function get_device_info(device_id, callback, error) {
  redis.get("device:"+device_id, function(err, data){
    if(err) {
      error(err);
    } else {
      callback(JSON.parse(data));
    }
  });
}
exports.get_device_info = get_device_info;

function set_device_info(device_id, data, callback, error) {
  redis.set("device:"+device_id, JSON.stringify(data), function(err, data){
    if(err) {
      error(err);
    } else {
      callback(data);
    }
  })
}
exports.set_device_info = set_device_info;
