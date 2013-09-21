var geotrigger = require('../geotrigger-helper');

function device (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  geotrigger.new_session(request.query.access_token, response, function(session){
    console.log(session.device_id);
    response.end(JSON.stringify({"device_id":session.device_id}));
  });
}

module.exports = exports = device;