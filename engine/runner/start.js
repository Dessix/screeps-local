const Q = require('q')
// Q.___reject = Q.reject
// Q.reject = function (...a) {
//   console.error(...a)
//   return Q.___reject.apply(this, a)
// }
// const C = require('../.engine/game/constants.js')
// C.UPGRADE_CONTROLLER_POWER *= 10
// C.HARVEST_POWER *= 10
// C.SOURCE_ENERGY_CAPACITY *= 10
const Core = require('./Core')
const NRP = require('node-redis-pubsub')
let ps = new NRP({ port: 6379, scope: 'screeps-local' })
const db = require('./db')

console.log('Creating core')
let core = new Core(100)

console.log('Initializing engine')
console.log('setupMain', core.setupMain())
console.log('setupRunner', core.setupRunner())
console.log('setupProcessor', core.setupProcessor())
console.log('Engine started')

let lastTick = Date.now()
let tickAvg = 0
let tickTimes = [0]
core.on('roomsDone', () => {
  console.log('Rooms Done!')
  setTimeout(() => roomUpdate(), 0)
  setTimeout(() => roomMapUpdate(), 0)
  let time = Date.now() - lastTick
  lastTick = Date.now()
  tickTimes.push(time)
  let avg = tickTimes.reduce((l, v) => l + v, 0) / tickTimes.length
  console.log('Time:', time)
  console.log('Avg: ', avg)
})

function roomUpdate () {
  return Promise.all([
    core.getGameTime(),
    core.getAllRooms(),
    db.userMemory.find({}),
    core.getAllUsers(),
    db.roomObjects.find({})
  ]).then(res => {
    // console.log(res)
    let [gametime, rooms, memory, users, objects] = res
    objects.filter(o=>o && o._remove).forEach(o=>{
      db.roomObjects.remove({ _id: o._id })
    })
    // users = arrtoObj(users)
    rooms.forEach(room => {
      let objs = {}
      for (let id in objects){
        if(objects[id] && objects[id]._remove) objects[id] = null
        if (objects[id] && objects[id].room == room._id)
          objs[objects[id]._id] = objects[id]
      }
      // objs = arrtoObj(objs)
      let roomState = {
        objects: objs,
        gameTime: gametime,
        gametime: gametime,
        info: { mode: 'world' },
        users: arrtoObj(users)
      }
      // console.log('UPDATE', room._id, roomState)
      ps.emit(`room:${room._id}`, roomState)
    })
  }).catch(err => console.error(err))
}

function roomMapUpdate(){
  return Promise.all([
    core.getAllRooms(),
    db.roomObjects.find({})
  ]).then(res=>{
    let [rooms,objects] = res
    rooms.forEach(room => {
      let objs = {}
      for (let id in objects)
        if (objects[id].room == room._id)
          objs[objects[id]._id] = objects[id]
      // objs = arrtoObj(objs)
      let getType = (type)=>objects.filter(o=>o.room == room._id && o.type == type).map(o=>([o.x,o.y]))
      let roomMap = {
        w: getType('wall'),
        r: getType('road'),
        c: getType('creep'),
        s: getType('source'),
        m: getType('mineral'),
        k: [],
        pb: [],
        p: []
      }
      // console.log('UPDATE', room._id, roomState)
      ps.emit(`roomMap2:${room._id}`, roomMap)
    }).catch(err => console.error(err))  //
  })
}

function arrtoObj (arr) {
  return arr.reduce((l, o) => {
    l[o._id] = o
    return l
  }, {})
}
