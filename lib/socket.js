var dgram = require('dgram');


function createSocket (port, callback) {
  var server = dgram.createSocket("udp4");

  server.bind(port, function () {
    console.log("bound");

    callback(null, server);
  });
}

exports.createSocket = createSocket;