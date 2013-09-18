function games (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({"result":"ok"}));
}

module.exports = exports = games;