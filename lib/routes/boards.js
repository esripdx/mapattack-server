var geotrigger = require('../geotrigger-wrapper');

function boards (request, response) {
  
  geotrigger.get_tokens(request.query.device_id, function(err, tokens){
    
    geotrigger.get_triggers_for_tag(tokens, "board", function(err, data){
      var boards = [];

      if(data) {
        boards = data;
      }

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({"boards":boards}));
    });
  });
}

module.exports = exports = boards;