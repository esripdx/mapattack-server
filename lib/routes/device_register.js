var redis = require('../redis');
var arcgis = require('../arcgis');

function unknown_error(response, err) {
  console.log("Error!");
  console.log(err);
  response.end(JSON.stringify({"error":"server_error", "error_info":err}));
}

function device_register (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  if (request.query === undefined || request.query.device_id === undefined) {
    response.end(JSON.stringify({"error":"missing_parameter"}));
  } else {
    // Find out if we've already seen this device before 
    redis.device.get_profile(request.query.device_id, function(err, data) {
      if (err) {
        unknown_error(response, err);
      } else {
        if (data) {
          // Save updated name and profile info in redis
          console.log("Found existing device, updating info");
          redis.device.get_tokens(request.query.device_id, function(err, data){
            console.log(data);
          });
          redis.device.set_profile(request.query.device_id, {
            name: request.query.name,
            avatar: request.query.avatar
          }, function (err) {
            if (err) {
              unknown_error(response, err);
            } else {
              response.end(JSON.stringify({"result":"ok", "device_id":request.query.device_id}));
            }
          });
        } else {
          // Register a new device with AGO and store tokens in redis
          console.log("Creating new AGO device");

          arcgis.register_device(function(err, data){
            console.log(data);
            redis.device.set_tokens(request.query.device_id, {
              access_token: data.deviceToken.access_token,
              refresh_token: data.deviceToken.refresh_token
            }, function(err) {
              if (err) {
                unknown_error(response, err);
              } else {
                console.log("Saved tokens");
              }
            });
            redis.device.set_profile(request.query.device_id, {
              name: request.query.name,
              avatar: request.query.avatar
            }, function(err) {
              if (err) {
                unknown_error(response, err);
              } else {
                console.log("Saved profile data");
              }
            });
          });

          response.end(JSON.stringify({"result":"ok", "device_id":request.query.device_id}));
        }
      }
    });
  }
}

module.exports = exports = device_register;