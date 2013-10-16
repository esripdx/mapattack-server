var geotrigger = require('../geotrigger-helper');

function device (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  geotrigger.new_session(request.query.access_token, response, function(session){
    session.redis.device.get_profile(session.device_id, function(err, profile){      
      console.log(session.device_id);
      response.end(JSON.stringify({
        "device_id": session.device_id,
        "name": profile.name || null,
        "access_token": session.geotrigger.token
      }));
    });
  });
}

module.exports = exports = device;