var http = require('http');

function createWebServer (port, callback) {
  var server = http.createServer();

  server.listen(port);

  callback(null, server);
}

exports.createWebServer = createWebServer;