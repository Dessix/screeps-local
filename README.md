# Important note:
## DO NOT expect this to work properly!
This is still heavily WIP

# Simple setup: 

Node 6+ REQUIRED

* Install mongodb
* Install redis
* Inside this repo:
	npm install
* run `node setup` to download and unpack the screeps code
* run `node index.js` for the web server
* run `node engine/runner/start.js` for tick processing

use setup api to add rooms
http://localhost:8080/api/setup/add-room?room=E1S1

# TODO
* Better README

# Working:
## UI
* Map viewer (Minus the live 'pixel' preview)
* Code editor
* Console
* Rooms

## Engine
* User code, all runs without issue (So far)
* Initial spawn placement, may require setting worldStatus to 'empty' for the user int eh DB first.

# Not Working:
## UI
* Memory editor, needs ws api additions
* Adding certain objects (Flags, etc)

## Engine
* Unknown, feel free to submit an issue!
