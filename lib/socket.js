var dgram = require('dgram');


function createSocket (port, callback) {
  var server = dgram.createSocket("udp4");

  server.bind(port, function () {
    callback(null, server);
  });
}

exports.createSocket = createSocket;