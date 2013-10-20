var Redis = require('redis'),
   config = require('../config.json');

var redis = Redis.createClient(config.redis_port, config.redis_host);

function generic_callback(err, data) {}

function increment(counter, num) {
  redis.incrby(counter, num, generic_callback);
}

function udp_out(num) {
  increment("udp_out", num);
}

function udp_in(num) {
  increment("udp_in", num);
}

function socketio_out(num) {
  increment("socketio_out", num);
}

function socketio_clients_incr() {
  redis.incr("socketio_clients", generic_callback);
}

function socketio_clients_decr() {
  redis.decr("socketio_clients", generic_callback);
}

function http_incr(path) {
  redis.hincrby("http_requests", path, 1, generic_callback);
}

function munin_config(req, res) {
  //////////////////////////////////////////////////////////////////////////////////
  res.write("multigraph mapattack_udp_traffic\n");

  res.write("graph_title MapAttack UDP Traffic\n");
  res.write("graph_category mapattack\n");
  res.write("graph_period second\n");
  res.write("graph_vlabel per ${graph_period}\n");

  res.write("input.label Input\n");
  res.write("input.info The rate of input from MapAttack clients\n");
  res.write("input.type DERIVE\n");
  res.write("input.min 0\n");

  res.write("output.label Output\n");
  res.write("output.info The rate of output to MapAttack clients\n");
  res.write("output.type DERIVE\n");
  res.write("output.min 0\n");

  //////////////////////////////////////////////////////////////////////////////////
  res.write("multigraph mapattack_socketio_clients\n");
  res.write("graph_category mapattack\n");
  res.write("graph_title MapAttack Socket.io Connected Clients\n");
  res.write("clients.label Connected Clients\n");
  res.write("clients.info The number of currently-connected socket.io clients\n");
  res.write("clients.min 0\n");

  //////////////////////////////////////////////////////////////////////////////////
  res.write("multigraph mapattack_socketio_traffic\n");

  res.write("graph_title MapAttack Socket.io Traffic\n");
  res.write("graph_category mapattack\n");
  res.write("graph_period second\n");
  res.write("graph_vlabel per ${graph_period}\n");

  res.write("output.label Output\n");
  res.write("output.info The rate of output to MapAttack socket.io clients\n");
  res.write("output.type DERIVE\n");
  res.write("output.min 0\n");

  //////////////////////////////////////////////////////////////////////////////////
  res.write("multigraph mapattack_http_requests\n");
  res.write("graph_title MapAttack HTTP Requests\n");
  res.write("graph_category mapattack\n");
  res.write("graph_period second\n");
  res.write("graph_vlabel per ${graph_period}\n");

  redis.hgetall("http_requests", function(err, data){
    for(var i in data) {
      var key = i.substring(1).replace('/','_');
      res.write(key+".label "+i.substring(1)+"\n");
      res.write(key+".type DERIVE\n");
      res.write(key+".min 0\n");
    }
    res.end();
  });
}

function munin_stats(req, res) {

  redis.multi()
    .get("udp_in")
    .get("udp_out")
    .get("socketio_clients")
    .get("socketio_out")
    .hgetall("http_requests")
    .exec(function(err, data){

      res.write("multigraph mapattack_udp_traffic\n");
      res.write("input.value "+(data[0] || 0)+"\n");
      res.write("output.value "+(data[1] || 0)+"\n");

      res.write("multigraph mapattack_socketio_clients\n");
      res.write("clients.value "+(data[2] || 0)+"\n");

      res.write("multigraph mapattack_socketio_traffic\n");
      res.write("output.value "+(data[3] || 0)+"\n");

      res.write("multigraph mapattack_http_requests\n");
      for(var i in data[4]) {
        var key = i.substring(1).replace('/','_');
        res.write(key+".value "+data[4][i]+"\n");
      }

      res.end();
    });
}

exports.udp_out = udp_out;
exports.udp_in = udp_in;
exports.socketio_out = socketio_out;
exports.socketio_clients_incr = socketio_clients_incr;
exports.socketio_clients_decr = socketio_clients_decr;

exports.munin_config = munin_config;
exports.munin_stats = munin_stats;
