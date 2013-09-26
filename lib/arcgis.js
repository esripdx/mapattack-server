var request = require('request');

var config = require('../config.json');

function register_device (callback) {
  var headers = {
  };

  request({
    url: "https://www.arcgis.com/sharing/oauth2/registerDevice",
    headers: headers,
    method: "POST",
    form: {
      client_id: config.ago_client_id,
      f: "json"
    }
  }, function(err, data){
    var tokens;
    try {
      tokens = JSON.parse(data.body);
      callback(null, tokens);
    } catch(e) {
      callback(e);
    }
  });
}

exports.register_device = register_device;

function update_device (session, push_token, callback) {
  var headers = {
  };
  var params = {
    f: "json",
    token: session.geotrigger.token
  };
  if(push_token.apns_prod_token) {
    params.apnsProdToken = push_token.apns_prod_token;
  } else if(push_token.apns_sandbox_token) {
    params.apnsSandboxToken = push_token.apns_sandbox_token;
  } else if(push_token.gcm_registration_id) {
    params.gcmRegistrationId = push_token.gcm_registration_id;
  }

  request({
    url: "https://www.arcgis.com/sharing/oauth2/apps/"+config.ago_client_id+"/devices/"+session.device_id+"/update",
    headers: headers,
    method: "POST",
    form: params
  }, function(err, data){
    var response;
    try {
      response = JSON.parse(data.body);
      callback(null, response);
    } catch(e) {
      callback(e);
    }
  });
}

exports.update_device = update_device;

