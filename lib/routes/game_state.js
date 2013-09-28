var geotrigger = require('../geotrigger-helper');
var Terraformer = require('Terraformer');
var debug = require('../debug');

function game_state (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  // TODO: Check for game_id parameter
  var game_id = request.query.game_id;

  geotrigger.new_session(request.query.access_token, response, function(session){
    try {
      session.redis.game.get_board_id(game_id, function(err, board_id){
        if(board_id == null) {
          response.end(JSON.stringify({error: "No board found for game_id: "+game_id}));
        } else {

          // Get bounding box for the game
          session.get_triggers_for_tag("board:"+board_id, function(err, boards){
            if(err || boards == null || boards.length == 0) {
              response.end(JSON.stringify({error: "No board found for game: "+game_id}));
            } else {
              debug('game', "Found game '"+boards[0].properties.title+"' (board "+board_id+", game "+game_id+")");

              var polygon = new Terraformer.Polygon(boards[0].condition.geo.geojson);
              session.redis.game.get_coin_states(game_id, function(err, coin_states){
                debug('game', 'Coins:');
                debug('game', coin_states);

                session.get_triggers_for_tag("game:"+game_id, function(err, triggers){
                  debug('game', "Found "+triggers.length+" coins on game "+game_id);
                  var coins = [];
                  var red_score = 0;
                  var blue_score = 0;

                  for(var i in triggers) {
                    var trigger = triggers[i];
                    coins.push({
                      coin_id: trigger.triggerId,
                      latitude: trigger.condition.geo.latitude,
                      longitude: trigger.condition.geo.longitude,
                      value: parseInt(trigger.properties.value),
                      team: (coin_states[trigger.triggerId] || null)
                    });
                    if(coin_states[trigger.triggerId] == "red") {
                      red_score += parseInt(trigger.properties.value);
                    } else if(coin_states[trigger.triggerId] == "blue") {
                      blue_score += parseInt(trigger.properties.value);
                    }
                  }

                  var red_players = 0;
                  var blue_players = 0;

                  session.redis.game.get_players(game_id, function(err, player_vals) {
                    if(err){
                      response.end(JSON.stringify({
                        error: "Error retrieving players"
                      }));
                    } else {
                      debug('game', {"players":player_vals});

                      // Collect all the device_ids and retrieve the data from redis
                      var device_ids = [];
                      for(var i in player_vals.red) {
                        device_ids.push(player_vals.red[i]);
                      }
                      for(var i in player_vals.blue) {
                        device_ids.push(player_vals.blue[i]);
                      }

                      session.redis.game.get_all_player_data(device_ids, function(err, player_data) {
                        // debug('game', player_data);

                        session.redis.game.get_all_scores(game_id, function(err, scores){
                          // debug('game', {scores:scores});
                          var players = [];

                          var teams = ["red","blue"];
                          for(var j in teams) {
                            for(var i in player_vals[teams[j]]) {
                              var device_id = player_vals[teams[j]][i];
                              var player = {
                                device_id: device_id,
                                team: teams[j],
                                avatar: "http://api.mapattack.org/user/"+device_id+".jpg",
                                score: 0
                              };
                              if(teams[j]=="red") {
                                red_players++;
                              } else {
                                blue_players++;
                              }
                              if(player_data[device_id]) {
                                player.latitude = player_data[device_id].location.latitude;
                                player.longitude = player_data[device_id].location.longitude;
                                player.timestamp = player_data[device_id].location.timestamp;
                                player.speed = player_data[device_id].location.speed;
                                player.bearing = player_data[device_id].location.bearing;
                                player.accuracy = player_data[device_id].location.accuracy;
                                if(player_data[device_id].profile.name) {
                                  player.name = player_data[device_id].profile.name;
                                } else {
                                  player.name = device_id.substring(0,3);
                                }
                              }
                              if(scores[device_id]) {
                                player.score = scores[device_id];
                              }

                              players.push(player);
                            }
                          }

                          var game = {
                            game_id: game_id,
                            name: (boards[0].properties.title || "Untitled Game"),
                            bbox: polygon.bbox(),
                            teams: {
                              blue: {
                                size: blue_players,
                                score: blue_score
                              },
                              red: {
                                size: red_players,
                                score: red_score
                              }
                            }
                          };

                          response.end(JSON.stringify({
                            game: game,
                            coins: coins,
                            players: players
                          }));

                        });

                      });

                    }
                  });

                });

              });
            }
          });
        }
      });

    } catch(e) {
      console.log(e);
      response.end(JSON.stringify({"error": e}));      
    }
  });
}

module.exports = exports = game_state;