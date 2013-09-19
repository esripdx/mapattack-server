var request = require('request');
var redis = require('./redis');
var Geotrigger = require('./geotriggers.js');

var config = require('../config.json');

function create_geotrigger_session(tokens) {
  return new Geotrigger.Session({
    clientId: config.ago_client_id,
    token: tokens.access_token,
    refreshToken: tokens.refresh_token
  });
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

function get_triggers_for_tag (tokens, tag, callback) {
  console.log(tokens);
  var geo = create_geotrigger_session(tokens);
  geo.request("trigger/list", {
    tags: tag,
    geo: {
      latitude: 45.5165,
      longitude: -122.6764,
      distance: 400
    }
  }, function(err, data){
    console.log(err, data);
    console.log(err.parameters);
    if(err) {
      callback(err);      
    } else {
      callback(null, data.triggers);      
    }
  });

}

exports.get_triggers_for_tag = get_triggers_for_tag;
