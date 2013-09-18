var redis = require('../redis');

function unknown_error(response, err) {
  console.log("Error!");
  console.log(err);
  response.end(JSON.stringify({"error":"server_error", "error_info":err}));
}

function device_register (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  if(request.query == null || request.query.device_id == null) {
    response.end(JSON.stringify({"error":"missing_parameter"}));
  } else {
    // Find out if we've already seen this device before 
    redis.get_device_info(request.query.device_id, function(data){
      if(data) {
        // Save updated name and profile info in redis
        console.log("Found existing device, updating info");
        redis.set_device_info(request.query.device_id, {
          name: request.query.name,
          avatar: request.query.avatar
        }, function(){
          response.end(JSON.stringify({"result":"ok", "device_id":request.query.device_id}));
        }, function(err){
          unknown_error(response, err);
        });
      } else {
        // Register a new device with AGO and store tokens in redis
        console.log("Creating new AGO device");
        redis.set_device_info(request.query.device_id, {
          name: request.query.name,
          avatar: request.query.avatar
        }, function(){
          response.end(JSON.stringify({"result":"ok", "device_id":request.query.device_id}));
        }, function(err){
          unknown_error(response, err);
        });
      }
    }, function(err){
      unknown_error(response, err);
    });
  }
}

module.exports = exports = device_register;