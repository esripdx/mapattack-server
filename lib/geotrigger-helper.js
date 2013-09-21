var request = require('request');
var redis = require('./redis');
var Geotrigger = require('./geotriggers.js');

var config = require('../config.json');

function create_geotrigger_session(ma_access_token, tokens) {
  var session = new Geotrigger.Session({
    clientId: config.ago_client_id,
    token: tokens.access_token,
    refreshToken: tokens.refresh_token
  });
  console.log("Access Token: "+tokens.access_token);
  session.on("authentication:success", function(){
    // Store the new access token
    redis.device.set_tokens(ma_access_token, {
      access_token: session.token,
      refresh_token: session.refreshToken
    }, function(err,data){});
    console.log("authentication:success stored new tokens");
  });
  return session;
}

exports.create_geotrigger_session = create_geotrigger_session;

function get_tokens (ma_access_token, callback) {
  // Get an access token, and optionally refresh it if it's expired
  redis.device.get_tokens(ma_access_token, function(err, tokens){
    console.log("Looking up access token for mapattack access token: "+ma_access_token);
    if(err) {
      callback(err);
    } else {
      callback(null, tokens);
    }
  });
}

exports.get_tokens = get_tokens;

function new_session(ma_access_token, response, callback) {
  get_tokens(ma_access_token, function(err, tokens){
    if(err || tokens.access_token == null) {
      // Error retrieving tokens
      console.log(err, tokens);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({"error":"error retrieving access token"}));
    } else {
      var session = exports;
      session.geotrigger = create_geotrigger_session(ma_access_token, tokens);
      callback(session);
    }
  });
}

exports.new_session = new_session;

function generate_id(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

exports.generate_id = generate_id;

function find_id_in_tags(input_tags, prefix) {
  // Given a list of tags like "board","board:10","game","game:20","game:21" and a prefix "board", return "10"
  var result = null;
  input_tags.forEach(function(t){
    if(match=t.match(new RegExp('^'+prefix+':([^:]+)$'))) {
      result = match[1];
    }
  });
  return result;
}

exports.find_id_in_tags = find_id_in_tags;

function find_ids_in_tags(input_tags, prefix) {
  // Given a list of tags like "board","board:10","game","game:20","game:21" and a prefix "game", return ["20","21"]
  var result = [];
  input_tags.forEach(function(t){
    if(match=t.match(new RegExp('^'+prefix+':([^:]+)$'))) {
      result.push(match[1]);
    }
  });
  return result;
}

exports.find_ids_in_tags = find_ids_in_tags;

/** Session Functions **/

function get_triggers_for_tag (tag, geo_param, callback) {
  this.geotrigger.request("trigger/list", {
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

function trigger_update (params, callback) {
  this.geotrigger.request("trigger/update", params, function(err, data){
    if(err) {
      console.log(err);
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

exports.trigger_update = trigger_update;

function device_update (params, callback) {
  this.geotrigger.request("device/update", params, function(err, data){
    if(err) {
      console.log(err);
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

exports.device_update = device_update;

function send_location_update (locationData, callback) {
  this.geotrigger.request("location/update", locationData, callback);
  request({
    url: config.location_url,
    headers: headers,
    method: "POST",
    json: locationData
  }, callback);
}

exports.send_location_update = send_location_update;


