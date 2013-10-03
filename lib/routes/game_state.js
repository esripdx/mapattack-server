var Terraformer = require('Terraformer');
var debug = require('../debug');
var geo = require('../geo');
var redis = require('../redis');

function game_state (request, response) {
  response.writeHead(200, { "Content-Type": "application/json" });

  if(request.query == null || request.query.game_id == null) {
    response.end(JSON.stringify({error: "No game_id specified"}));
  } else {
    var game_id = request.query.game_id;
    try {
      redis.game.get_data(game_id, function(err, game_data){
        if(err || game_data == null) {
          response.end(JSON.stringify({error: "No game data was found for game_id: "+game_id}));
        } else {
          debug('game', "Found game '"+game_data.name+"' (game "+game_id+")");
          redis.game.get_coins(game_id, function(err, coin_data){
            debug('game', 'Coins:');
            debug('game', coins);

            var coins = [];
            var red_score = 0;
            var blue_score = 0;

            redis.game.get_coin_states(game_id, function(err, coin_states){

              for(var coin_id in coin_data) {
                var coin = JSON.parse(coin_data[coin_id]);
                coins.push({
                  coin_id: coin_id,
                  latitude: coin.latitude,
                  longitude: coin.longitude,
                  value: parseInt(coin.value),
                  team: ((coin_states && coin_states[coin_id]) || null)
                });
                if(coin_states && coin_states[coin_id] == "red") {
                  red_score += parseInt(coin.value);
                } else if(coin_states && coin_states[coin_id] == "blue") {
                  blue_score += parseInt(coin.value);
                }
              }

              var red_players = 0;
              var blue_players = 0;

              redis.game.get_players(game_id, function(err, player_vals) {
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

                  redis.game.get_all_player_data(device_ids, function(err, player_data) {
                    // debug('game', player_data);

                    redis.game.get_all_scores(game_id, function(err, scores){
                      // debug('game', {scores:scores});
                      var players = [];

                      var teams = ["red","blue"];
                      for(var j in teams) {
                        for(var i in player_vals[teams[j]]) {
                          var device_id = player_vals[teams[j]][i];
                          var player = {
                            device_id: device_id,
                            team: teams[j],
                            score: 0
                          };
                          if(teams[j]=="red") {
                            red_players++;
                          } else {
                            blue_players++;
                          }
                          if(player_data[device_id] && player_data[device_id].location) {
                            player.latitude = player_data[device_id].location.latitude;
                            player.longitude = player_data[device_id].location.longitude;
                            player.timestamp = player_data[device_id].location.timestamp;
                            player.speed = player_data[device_id].location.speed;
                            player.bearing = player_data[device_id].location.bearing;
                            player.accuracy = player_data[device_id].location.accuracy;
                          }
                          if(player_data[device_id].profile && player_data[device_id].profile.name) {
                            player.name = player_data[device_id].profile.name;
                          } else {
                            player.name = device_id.substring(0,3);
                          }
                          if(scores[device_id]) {
                            player.score = (scores[device_id] || 0);
                          }

                          players.push(player);
                        }
                      }

                      redis.game.is_active(game_id, function(err, active){
                        var game = {
                          game_id: game_id,
                          active: active,
                          name: (game_data.name || "Untitled Game"),
                          bbox: game_data.bbox,
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

                  });

                }
              });



            });
          });
        }
      });

    } catch(e) {
      console.log(e);
      response.end(JSON.stringify({"error": e}));      
    }
  }

}

module.exports = exports = game_state;