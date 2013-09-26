var redis = require('../redis');
var arcgis = require('../arcgis');
var geotrigger = require('../geotrigger-helper');
var debug = require('../debug');

function unknown_error(response, err) {
  console.log("Error!");
  console.log(err);
  response.end(JSON.stringify({"error":"server_error", "error_info":err}));
}

function device_register_apns (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  geotrigger.new_session(request.query.access_token, response, function(session){
    try {
      // Note: The update_device method doesn't properly handle refreshing an expired token, so
      // it is assumed this route will only be run when the mapattack server has a valid access token.
      // TODO: should probably fix this to make it re-try after refreshing the access token
      arcgis.update_device(session, request.query, function(err, ago_response){
        debug('auth', "push token registration response");
        debug('auth', ago_response);
        response.end(JSON.stringify({"device_id":ago_response}));
      });
    } catch(e) {
      response.end(JSON.stringify({"error":e.message}));
    }
  });    
}

module.exports = exports = device_register_apns;