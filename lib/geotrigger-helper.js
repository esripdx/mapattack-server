var request = require('request');
var redis = require('./redis');
var Geotrigger = require('./geotriggers.js');

var config = require('../config.json');
var debug = require('./debug');

function create_geotrigger_session(ma_access_token, tokens) {
  var session = new Geotrigger.Session({
    clientId: config.ago_client_id,
    token: tokens.access_token,
    refreshToken: tokens.refresh_token
  });
  debug('auth', "Access Token: "+tokens.access_token);
  session.on("authentication:success", function(){
    // Store the new access token
    redis.device.set_tokens(ma_access_token, {
      device_id: tokens.device_id,
      access_token: session.token,
      refresh_token: tokens.refresh_token
    }, function(err,data){});
    debug('auth', "authentication:success stored new tokens");
  });
  return session;
}

exports.create_geotrigger_session = create_geotrigger_session;

function get_tokens (ma_access_token, callback) {
  // Get an access token, and optionally refresh it if it's expired
  redis.device.get_tokens(ma_access_token, function(err, tokens){
    debug('auth', "Looking up access token for mapattack access token: "+ma_access_token);
    if(err) {
      callback(err);
    } else {
      callback(null, tokens);
    }
  });
}

exports.get_tokens = get_tokens;

function new_session(ma_access_token, response, callback) {
  if(ma_access_token == null || ma_access_token == '') {
    debug('auth', 'No access token provided');
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({"error":"error retrieving access token"}));
  } else {
    get_tokens(ma_access_token, function(err, tokens){
      if(err || tokens.access_token == null) {
        // Error retrieving tokens
        debug('auth', 'Error retrieving access token');
        debug('auth', err);
        debug('auth', tokens);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({"error":"error retrieving access token"}));
      } else {
        var session = exports;
        session.geotrigger = create_geotrigger_session(ma_access_token, tokens);
        session.device_id = tokens.device_id;
        callback(session);
      }
    });
  }
}

exports.new_session = new_session;

function new_app_session(callback) {
  redis.get_app_token(function(err, token){
    if(token) {
      var geotrigger = new Geotrigger.Session({
        clientId: config.ago_client_id,
        clientSecret: config.ago_client_secret,
        token: token
      });
      debug('auth', 'Using cached app access token');
      var session = exports;
      session.geotrigger = geotrigger;
      callback(session);
    } else {
      var geotrigger = new Geotrigger.Session({
        clientId: config.ago_client_id,
        clientSecret: config.ago_client_secret
      });
      debug('auth', 'Generating new app access token');
      geotrigger.request(geotrigger.tokenUrl, {
        client_id: config.ago_client_id,
        client_secret: config.ago_client_secret,
        grant_type: 'client_credentials'
      }, function(err, data){
        var session = exports;
        geotrigger.token = data.access_token;
        session.geotrigger = geotrigger;
        // Cache the access token in redis for slightly less than the duration of the token to make sure we generate a new token if needed
        redis.set_app_token(data.access_token, data.expires_in, function(err, data){});
        callback(session);
      });
    }
  });
}

exports.new_app_session = new_app_session;

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

function get_nearby_triggers_for_tag (tag, geo_param, callback) {
  this.geotrigger.request("trigger/list", {
    tags: tag,
    geo: geo_param
  }, function(err, data){
    if(err) {
      debug('trigger', err);
      callback(err);      
    } else {
      callback(null, data.triggers);      
    }
  });
}

exports.get_nearby_triggers_for_tag = get_nearby_triggers_for_tag;

function get_triggers_for_tag (tag, callback) {
  this.geotrigger.request("trigger/list", {
    tags: tag
  }, function(err, data){
    if(err) {
      debug('trigger', err);
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
      debug('trigger', err);
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
      debug('device', err);
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

exports.device_update = device_update;

function send_location_update (params, callback) {
  this.geotrigger.request("location/update", params, callback);
}

exports.send_location_update = send_location_update;

function set_udp_info (address, port) {
  debug('udp', "Saving UDP port info for device: "+this.device_id + " to "+address+":"+port);
  redis.device.set_udp_info(this.device_id, address, port, function(err, data){});
}

exports.set_udp_info = set_udp_info;

exports.redis = redis;
