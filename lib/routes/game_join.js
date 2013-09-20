var geotrigger = require('../geotrigger-helper');

function game_join (request, response) {
  geotrigger.get_tokens(request.query.device_id, function(err, tokens){
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({"result":"ok"}));
  }
}

module.exports = exports = game_join;