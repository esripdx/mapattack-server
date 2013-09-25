var geotrigger = require('../geotrigger-helper');

function board_new (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  var board_id = geotrigger.generate_id(16);
  response.end(JSON.stringify({"board_id":board_id}));
}

module.exports = exports = board_new;