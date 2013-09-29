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

Creating a new device:

* name=Your Name
* avatar=base64-encoded image

Updating an existing device:

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
* name=Your Name
* avatar=base64-encoded image

Response:

* device_id
* access_token

Whatever device_id and access_token are returned by the register route should replace the values currently stored on the phone if any.


### device/register_push

Update the push notification tokens for the device.

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

And one of:
* gcm_registration_id=XXXXX
* apns_prod_token=XXXXX
* apns_sandbox_token=XXXXX


### board/new

Generates a new board_id

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

Response:

* board_id: XXXXXXXX

Note that this doesn't actually make any API requests or do anything other than generate an ID for you.


### board/list

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
* latitude=XXX
* longitude=XXX

Response:

* board_id
* name
* distance - meters
* bbox - [x,y,x,y]
* game:
 * game_id
 * is_active - true, false
 * red_team - number of people on the red team
 * blue_team
 * red_score - total score for the red team
 * blue_score - total score for the blue team


### board/state

* access_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
* board_id

Response:

* board
 * board_id
 * name - The title or "Untitled Board"
 * bbox - [x,y,x,y]
* coins - Array
 * coin_id
 * latitude
 * longitude
 * value

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


### user/:id.jpg

Return a user's avatar as a JPG image.


## UDP Messages

Documenting all the UDP messages that are sent and received. UDP messages are JSON encoded going up and down.

### Downstream: Player Locations

* device_id - String
* latitude - Float
* longitude - Float
* timestamp - Unix timestamp
* speed - Int, km/h
* bearing - Int
* accuracy - Int, meters

### Downstream: Coin States

* coin_id - String
* latitude - Float
* longitude - Float
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
* latitude - Float
* longitude - Float
* timestamp - Unix timestamp
* speed - Int, km/h
* bearing - Int
* accuracy - Int, meters

## Geotrigger API Usage

Documenting the usage of the Geotrigger API.

### Board Triggers

The board is represented as a large polygon trigger.

Tags:

* board - indicates that this trigger is a board, used to search for "board" triggers
* board:XXXXXX - specifies the board_id of this trigger
* board:twitter_id:XXXXXX - the Twitter ID of the person who created the board, for access control

Properties:

* title

### Coin Triggers

Each coin is a point+distance trigger.

Tags:

* coin - indicates that this trigger is a coin 
* coin:board:XXXXXX - the board_id this coin belongs to
* game:XXXXXX - the game_id this coin belongs to (activates this trigger for the game)

Properties:

* value: 10 (10, 20, 50)
* team: red (red, blue, [none])

### Devices

A player is active in a game when their device has a tag like the following

* game:XXXXXX


## Redis Schema

Documenting all the keys used in Redis.

### Devices

Profile data:
* Key: device:profile:XXXXXX => JSON object

AGO access tokens:
* Key: device:tokens:XXXXXX => JSON object

Active game for the device:
* Key: device:active_game:XXXXXX => {game_id: "XXXX", team: "red"}

Last location of each device
* Value: device:location:XXXXXX => JSON object


### Games

Set of members of each team of a game:
* Set: game:XXXXXX:red:members => device_ids
* Set: game:XXXXXX:blue:members => device_ids

Scores of each device
* Hash: game:XXXXXX:red device:XXXXXX => Number
* Hash: game:XXXXXX:blue device:XXXXXX => Number
* HINCRBY game:XXXXXX:red device:XXXXXX 1

Which team has claimed a coin
* Hash game:XXXXXX:coins XXXXXX => red/blue

Total score for red team:
* HVALS game:XXXXXX:red => list of numbers

Active game for the board
* Value: board:XXXXXX:game => game_id

Get the board for a game
* Value: game:XXXXXX:board => board_id


## Testing

`curly http://api.mapattack.org/device/register`

returns an access token

`curly http://api.mapattack.org/board/list -d latitude=45.5165 -d longitude=-122.6764 -d access_token=XX`

returns a list of boards

`curly http://api.mapattack.org/game/create -d access_token=XX -d board_id=x`

returns a game_id

`curly http://api.mapattack.org/game/start -d access_token=XX -d game_id=x`


