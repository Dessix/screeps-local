// const NeDB = require('nedb')
const monk = require('monk')
const config = require('./config')
let db = monk(config.mongo.uri, { castIds: false })

let dbs = {}
module.exports = dbs

add('users')
add('users.memory')
add('users.code')
add('rooms.terrain')
add('transactions')
add('rooms')
add('rooms.flags')
add('rooms.intents')
add('rooms.objects')
add('localStorage')

function add (name) {
  let ccName = name.replace(/s\.(.)/, (match, letter) => letter.toUpperCase())
  dbs[name] = getDB(name)
  dbs[ccName] = dbs[name]
// Object.defineProperty(dbs, name, {
//   get: () => {
//     delete dbs[name]
//     return dbs[name] = getDB(name)
//   }
// })
}

function getDB (name) {
  return db.get(name)
// return new NeDB({
//   filename: `${__dirname}/data/${name}.db`,
//   autoload: true
// })
}
