var request = require('request');
var redis = require('./redis');
var Geotrigger = require('./geotriggers.js');

var config = require('../config.json');

function create_geotrigger_session(device_id, tokens) {
  var session = new Geotrigger.Session({
    clientId: config.ago_client_id,
    token: tokens.access_token,
    refreshToken: tokens.refresh_token
  });
  session.on("authentication:success", function(){
    // Store the new access token
    redis.device.set_tokens(device_id, {
      access_token: session.token,
      refresh_token: session.refreshToken
    }, function(err,data){});
    console.log("authentication:success stored new tokens");
  });
  return session;
}

exports.create_geotrigger_session = create_geotrigger_session;

function send_location_update (locationData, callback) {
  var headers = {
    "Authorization": "Bearer " + config.access_token
  };

  request({
    url: config.location_url,
    headers: headers,
    method: "POST",
    json: locationData
  }, callback);
}

exports.send_location_update = send_location_update;

function get_tokens (device_id, callback) {
  // Get an access token, and optionally refresh it if it's expired
  redis.device.get_tokens(device_id, function(err, tokens){
    console.log("Looking up access token for device "+device_id);
    if(err) {
      callback(err);
    } else {
      callback(null, tokens);
    }
  });
}

exports.get_tokens = get_tokens;

function get_triggers_for_tag (device_id, tokens, tag, geo_param, callback) {
  var session = create_geotrigger_session(device_id, tokens);
  session.request("trigger/list", {
    tags: tag,
    geo: geo_param
  }, function(err, data){
    if(err) {
      console.log(err);
      callback(err);      
    } else {
      callback(null, data.triggers);      
    }
  });

}

exports.get_triggers_for_tag = get_triggers_for_tag;
