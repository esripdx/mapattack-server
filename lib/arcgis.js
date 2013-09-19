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