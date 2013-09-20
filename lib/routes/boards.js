var geotrigger = require('../geotrigger-helper');

function boards (request, response) {

  if(request.query.latitude == null) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({"boards":[]}));
  } else {
    geotrigger.new_session(request.query.access_token, response, function(session){
      session.get_triggers_for_tag("board", {
        latitude: request.query.latitude,
        longitude: request.query.longitude,
        distance: 400
      }, function(err, data){
        var boards = [];

        if(data) {
          data.forEach(function(e){
            // Find the tag matching "board:id"
            var board_id = geotrigger.find_id_in_tags(e.tags, "board");
            boards.push({
              id: board_id,
              name: "Board " + board_id
            });
          })
        }

        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({"boards":boards}));
      });
    });
  }
}

module.exports = exports = boards;