# Important note:
## DO NOT expect this to work properly!
This is still heavily WIP

# Simple setup: 

Node 6+ REQUIRED

* Install mongodb
* Install redis
* Inside this repo:
	npm install
* run `node setup/getpackage.js`
* run `node setup/unpackengine.js`
* run `node index.js`
* run `node engine/runner/start.js`

use setup api to add rooms
http://localhost:8080/api/setup/add-room?room=E1S1