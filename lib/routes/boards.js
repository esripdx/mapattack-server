var geotrigger = require('../geotrigger-helper');

function boards (request, response) {

  if(request.query.latitude == null) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({"boards":[]}));
  } else {
    console.log("Making authenticated_request");
    geotrigger.new_session(request.query.device_id, response, function(session){
      console.log("authenticated_request finished");
      session.get_triggers_for_tag(request.query.device_id, "board", {
        latitude: request.query.latitude,
        longitude: request.query.longitude,
        distance: 400
      }, function(err, data){
        var boards = [];

        if(data) {
          boards = data;
        }

        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({"boards":boards}));
      });
    });
  }
}

module.exports = exports = boards;