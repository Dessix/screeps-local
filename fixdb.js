/**/
let db = require('./db')

db.users.find({}, (err, users) => {
  // users.forEach(user => db['users.memory'].update({ _id: user._id }, { memory: '{}' }, { upsert: true }))
  let defaultBranches = [{
    branch: 'default',
    activeSim: true,
    activeWorld: true,
    modules: {
      main: 'module.exports.loop = function(){ \n    console.log("tick",Game.time)\n}'
    },
    timestamp: Date.now()
  }]
  users.forEach(user => db['users.code'].update({ _id: user._id }, { _id: user._id, branches: defaultBranches }, { upsert: true }))
})
// // db['users.memory'].update({}, { $set: { novice: Date.now() }}, {multi: true}, (...a) => console.log(a))
/** /
let [,, srcdb, dstdb] = process.argv
if (!dstdb) dstdb = srcdb

const NeDB = require('nedb')
const monk = require('monk')

let mdb = monk('localhost/screeps-local', { castIds: false })

let ndb = new NeDB({
  filename: `${__dirname}/data/${srcdb}.db`,
  autoload: true
})

mdb.get(dstdb).drop()
console.log('starting')
ndb.find({}, (err, res) => {
  let insert = (db, r) => new Promise((resolve, reject) => {
    console.log('Inserting', r._id)
    mdb.get(db).insert(r, { castIds: false }, () => resolve())
  }).then(() => console.log('Inserted', r._id))
    .catch((err) => console.error(err))
  console.log('found', res.length)
  Promise.all(res.map(r => insert(dstdb, r))).then(() => {
    console.log('done')
    process.exit()
  })
})
/**/
