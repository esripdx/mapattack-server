function ping (request, response) {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("pong");
}

module.exports = exports = ping;