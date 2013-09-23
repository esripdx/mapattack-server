var redis = require('../redis');
var arcgis = require('../arcgis');
var geotrigger = require('../geotrigger-helper');
var debug = require('../debug');

function unknown_error(response, err) {
  console.log("Error!");
  console.log(err);
  response.end(JSON.stringify({"error":"server_error", "error_info":err}));
}

function create_new_ago_device(request, response) {
  var access_token = geotrigger.generate_id(48);

  arcgis.register_device(function(err, ago_device){
    debug('auth', "AGO device registration response");
    debug('auth', ago_device);

    var device_tokens = {
      device_id: ago_device.device.deviceId,
      access_token: ago_device.deviceToken.access_token,
      refresh_token: ago_device.deviceToken.refresh_token
    };

    redis.device.set_tokens(access_token, device_tokens, function(err) {
      if (err) {
        unknown_error(response, err);
      } else {
        debug('auth', "Saved tokens");
        redis.device.set_profile(device_tokens.device_id, {
          name: request.query.name,
          avatar: request.query.avatar
        }, function(err) {
          if (err) {
            unknown_error(response, err);
          } else {
            debug('auth', "Saved profile data");
            response.end(JSON.stringify({
              device_id: device_tokens.device_id,
              access_token: access_token
            }));
          }
        });
      }
    });
  });
}

function device_register (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  if (request.query === undefined || request.query.access_token === undefined || request.query.access_token == '') {
    // With no access_token, create a new device and return the device ID and access token
    debug('auth', "No device_id sent, creating a new device");
    create_new_ago_device(request, response);
  } else {
    // Find out if we've already seen this device before 
    redis.device.get_tokens(request.query.access_token, function(err, token) {
      if (err) {
        unknown_error(response, err);
      } else {
        if (token && token.device_id !== undefined) {
          // This device already exists, so update the existing profile info and return the same device_id and access_token
          debug('auth', "Device already exists, updating info");
          redis.device.set_profile(token.device_id, {
            name: request.query.name,
            avatar: request.query.avatar
          }, function (err) {
            if (err) {
              unknown_error(response, err);
            } else {
              response.end(JSON.stringify({
                device_id: token.device_id,
                access_token: request.query.access_token
              }));
            }
          });
        } else {
          // The phone thinks it has a device_id and access_token, but mapattack doesn't know about it yet.
          // Register a new device with AGO and return the new device info to the phone
          debug('auth', "device_id sent but mapattack doesn't know about it. Creating a new device.");
          create_new_ago_device(request, response);
        }
      }
    });
  }
}

module.exports = exports = device_register;