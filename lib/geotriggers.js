var request = require('request');


var config = require('../config.json');

function sendLocationUpdate (locationData, callback) {
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

exports.sendLocationUpdate = sendLocationUpdate;