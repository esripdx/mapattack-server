# MapAttack Game Server

```
$ npm install
$ node index.js
```

## Boards and Games




## HTTP API

### device/register

When the user enters their name/photo, the device registers.
The next time the app is open, it makes a request to register with the existing name/photo stored on the device.

Creating a new device

* name=Your Name
* avatar=base64-encoded image

Updating an existing device

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
* name=Your Name
* avatar=base64-encoded image


### device/register_push

Update the push notification tokens for the device.

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
* gcm_token=XXXXX
* or
* apns_token=XXXXX


### board/list

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
* latitude=XXX
* longitude=XXX


### game/create
Create a game given an existing board

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
* board_id=XXXXXXXXXXXXXXXXXXXX

Response:

* game_id


### game/start

Start an existing game

Internally, this applies the "active" game tag to the board's triggers, activating them for each device.

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
* game_id=XXXXXXXXXXXXXXXXXXXX


### game/join

The device is joining an existing game

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
* game_id=XXXXXXXXXXXXXXXXXXXX

Response:

* team=red or blue


### game/state

Retrieve all player and coin locations and state for a game

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
* game_id=XXXXXXXXXXXXXXXXXXXX

Response:

* players=[]
* coins=[]

player:
* location - Geohash
* TODO

coin:
* location - Geohash
* TODO


### game/end

The creator of the game ends the game. This de-activates all the triggers, and removes the game tag from all players' devices.

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
* game_id=XXXXXXXXXXXXXXXXXXXX






* name
* game ID
* players on red/blue teams
* distance
* geo data (center and distance)


## UDP Messages

Documenting all the UDP messages that are sent and received.

### Downstream: Player Locations

* device_id - String
* location - Geohash
* timestamp - Unix timestamp
* speed - Int, km/h
* bearing - Int
* accuracy - Int, meters

### Downstream: Coin States

* coin_id - String
* location - Geohash
* timestamp - Unix timestamp
* color - red, blue
* value - Int
* device_id - String - who captured the coin
* player_score - Int - total score for the player who captured this coin
* red_score - Int
* blue_score - Int

### Downstream: Game List

* board_id - String
* red_players - Int
* blue_players - Int
* red_score - Int
* blue_score - Int

### Upstream: Player Locations

* access_token - String
* location - Geohash
* timestamp - Unix timestamp
* speed - Int, km/h
* bearing - Int
* accuracy - Int, meters

## Tag Usage

Documenting the usage of tags in the Geotrigger API.

### Board Triggers

The board is represented as a large polygon trigger.

Tags:

* board - indicates that this trigger is a board, used to search for "board" triggers
* board:XXXXXX - specifies the board_id of this trigger
* board:username:XXXXXX - the Twitter username of the person who created the board, for access control
* game:XXXXXX - when a game is started from a board, this specifies the game_id of the active game

### Coin Triggers

Each coin is a point+distance trigger.

Tags:

* coin - indicates that this trigger is a coin 
* coin:board:XXXXXX - the board_id this coin belongs to
* coin:game:XXXXXX - the game_id this coin belongs to (activates this trigger for the game)

Properties:

* value: 10 (10, 20, 50)
* team: red (red, blue, [none])


## Redis Schema

Documenting all the keys used in Redis.

### Devices

Profile data:
* Key: device:profile:XXXXXX => hash

AGO access tokens:
* Key: device:tokens:XXXXXX => Hash

Active game for the device:
* Key: device:active_game:XXXXXX => game_id

Team of the device:
* Key: device:team:XXXXXX => red


### Games

List of members of each team of a game:
* Set: game:XXXXXX:red => device_ids
* Set: game:XXXXXX:blue => device_ids

Scores of each device
* Hash: game:XXXXXX:red device:XXXXXX => Number
* Hash: game:XXXXXX:blue device:XXXXXX => Number

Total score for red team:
* HVALS game:XXXXXX:red => list of numbers


