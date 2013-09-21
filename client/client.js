var dgram   = require('dgram'),
    msgpack = require('msgpack'),
    geohash = require('cgeohash');

var port = 5309;
var host = '127.0.0.1';
var location = geohash.encode(45.5165, -122.6764, 9);

var message = msgpack.pack({ 
  access_token: 'QkMrNJc4Q9ynf3ASxf5OWu8iyaWPEK8zWmtihkXECG4FcJn5',
  location: location, 
  timestamp: Math.floor(+new Date() / 1000),
  speed: 1,
  bearing: 180, 
  accuracy: 100,
});

var client = dgram.createSocket('udp4');

client.on('message', function (message, remote) {
  console.log("The packet came back: " + msgpack.unpack(message));
});


client.send(message, 0, message.length, port, host, function(err, bytes) {
  if (err) {
    console.error("ERROR: " + err);
  } else {
    console.log("sent!");
  }
});