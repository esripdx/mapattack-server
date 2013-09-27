var redis = require('../redis');
var fs = require('fs');
var debug = require('../debug');

function device_avatar (device_id, request, response) {

  redis.device.get_profile(device_id, function(err, profile){
    if(profile && profile.avatar) {
      debug('device', 'Found an avatar for device '+device_id+ ' ('+profile.avatar.length+' bytes)');
      var buf = new Buffer(profile.avatar, 'base64');
      response.writeHead(200, { 
        'Content-Type': 'image/jpeg',
        'Content-Length': buf.length
      });
      response.end(buf);
    } else {
      debug('device', 'No avatar found for device '+device_id);

      var file = __dirname+"/../../default-image.jpg";
      var stat = fs.statSync(file);
      var readStream = fs.createReadStream(file);

      response.writeHead(200, { 
        'Content-Type': 'image/jpeg',
        'Content-Length': stat.size
      });
      readStream.pipe(response);
    }
  });
}

module.exports = exports = device_avatar;