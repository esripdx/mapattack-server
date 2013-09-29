var dgram   = require('dgram');

var port = 5309;
var host = '127.0.0.1';

var latitude = 45.5165;
var longitude = -122.6764;

var message = JSON.stringify({ 
  access_token: 'bh3TPA8uQ8gBmtSq4qA1gkst25qOvtYSgOaHisLEuJk6Xqdd',
  latitude: latitude,
  longitude: longitude,
  timestamp: Math.floor(+new Date() / 1000),
  speed: 1,
  bearing: 180, 
  accuracy: 100,
});

var client = dgram.createSocket('udp4');

client.on('message', function (message, remote) {
  console.log("The response came back:");
  console.log(JSON.parse(message));
});


client.send(new Buffer(message), 0, message.length, port, host, function(err, bytes) {
  if (err) {
    console.error("ERROR: " + err);
  } else {
    console.log("sent!");
  }
});