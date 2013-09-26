var redis = require('../redis');
var fs = require('fs');

function device_avatar (device_id, request, response) {

  redis.device.get_profile(device_id, function(err, profile){
    if(profile && profile.avatar) {
      response.writeHead(200, { 'Content-Type': 'image/jpg' });
      response.end(profile.avatar);
    } else {
      var file = __dirname+"/../../default-image.jpg";
      var stat = fs.statSync(file);
      var readStream = fs.createReadStream(file);

      response.writeHead(200, { 
        'Content-Type': 'image/jpg',
        'Content-Length': stat.size
      });
      readStream.pipe(response);
    }
  });
}

module.exports = exports = device_avatar;