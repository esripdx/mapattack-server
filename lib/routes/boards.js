var geotrigger = require('../geotrigger-wrapper');

function boards (request, response) {
  
  geotrigger.get_tokens(request.query.device_id, function(err, tokens){

    if(request.query.latitude == null) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({"boards":[]}));
    } else {
      geotrigger.get_triggers_for_tag(request.query.device_id, tokens, "board", {
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
    }
  });
}

module.exports = exports = boards;