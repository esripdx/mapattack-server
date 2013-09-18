var dgram   = require('dgram'),
    msgpack = require('msgpack');

var port = 5309;
var host = '127.0.0.1';

var message = msgpack.pack({ lat: 45.5165, lon: -122.6764, bearing: 180, deviceID: 'abc123', accuracy: 100, timestamp: +new Date(), speed: 1 });

var client = dgram.createSocket('udp4');

client.on('message', function (message, remote) {
  console.log("The packet came back");
});


client.send(message, 0, message.length, port, host, function(err, bytes) {
  if (err) {
    console.error("ERROR: " + err);
  } else {
    console.log("sent!");
  }
});