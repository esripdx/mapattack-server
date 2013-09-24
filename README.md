# MapAttack Game Server

```
$ npm install
$ node index.js
```

== Game List ==
* name
* game ID
* players on red/blue teams
* distance
* geo data (center and distance)


== UDP Messages ==

=== Player Locations ===

* device_id
* location
* timestamp
* speed
* bearing
* accuracy

=== Coin States ===

* coin_id
* location
* timestamp
* color
* value
* device_id - who captured the coin

* player_score
* red_score
* blue_score

=== Game List ===

* board_id
* red_players
* blue_players
* red_score
* blue_score


