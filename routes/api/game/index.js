const fs = require('fs')
const express = require('express')
const app = module.exports = express.Router()
const {constants} = require('../../../config')
const C = constants
app.get('/time', (req, res) => res.success({ time: 1 }))

app.get('/room-status', (req, res) => {
  let { room } = req.query
  req.db.rooms.findOne({ _id: room }, { _id: 1, status: 1, novice: 1, own: 1, castIds: false }, (err, room) => {
    if (err) return res.fail(err.toString())
    res.success({ room})
  })
})

app.post('/gen-unique-object-name', (req, res) => {
  let name = require('crypto').randomBytes(8).toString('hex')
  res.success({ name})
})

app.post('/check-unique-object-name', (req, res) => {
  req.db.roomObjects.findOne({ type: req.body.type, user: req.user._id, name: req.body.name })
    .then(obj => {
      if (obj)
        res.fail()
      else
        res.success()
    })
})

app.get('/room-terrain', (req, res) => {
  let room = req.query.room
  console.log('room-terrain', room)
  req.db['rooms.terrain'].find({ room}, (err, terrain) => {
    if (terrain)
      res.success({ terrain: terrain })
    else
      res.end('Not Found', 404)
  })
})

app.post('/map-stats', (req, res) => {
  let stats = {}
  let { rooms } = req.body
  // req.db.rooms.update({}, { $set: { novice: Date.now() }})
  req.db.rooms.find({ _id: { $in: rooms }}, { _id: 1, status: 1, novice: 1, own: 1, castIds: false }, (err, rooms) => {
    let stats = {}
    let userIDs = rooms.filter(s => s.own).map(s => s.own.user)
    rooms.forEach(r => {
      stats[r._id] = r
    })
    req.db.users.find({ _id: { $in: userIDs }}, { _id: 1, badge: 1, username: 1 }, (err, users) => {
      let userList = {}
      users.forEach(u => userList[u._id] = u)
      res.success({'ok': 1,'gameTime': 1,'stats': stats, 'users': userList })
    })
  })

// {
// 'E31S47': {
//   'status': 'normal',
//   'novice': 1469878194386,
// 'own': {'user': '578963743fd9069e6b558762','level': 5}},
// 'E31S48': {'status': 'normal','novice': 1469878194386,
// 'own': {'user': '577efca9117b990b43842062','level': 0}},
// 'E31S49': {'status': 'normal','novice': 1469878194386,
// 'own': {'user': '577efca9117b990b43842062','level': 0}},
// 'E31S50': {'status': 'normal'},
// 'E31S51': {'status': 'newbie','novice': 1473410047531,'own': {'user': '57ab4c1bae69c93177567c75','level': 2}},
// 'E32S47': {'status': 'normal','novice': 1469878194386,'own': {'user': '577a76542fe3a52e25d9116c','level': 5}},
// 'E32S48': {'status': 'normal','novice': 1469878194386},
// 'E32S49': {'status': 'normal','novice': 1469878194386,'own': {'user': '577ae96c2fe3a52e25d98ed0','level': 6}},
// 'E32S50': {'status': 'normal'},
// 'E32S51': {'status': 'normal','novice': 1473410047531},
// 'E33S47': {'status': 'normal','novice': 1469878194386},
// 'E33S48': {'status': 'normal','novice': 1469878194386,'own': {'user': '577bedb847c3ef7031adeafc','level': 3}},
// 'E33S49': {'status': 'normal','novice': 1469878194386,'own': {'user': '577bc02e47c3ef7031adb268','level': 6}},
// 'E33S50': {'status': 'normal'},
// 'E33S51': {'status': 'normal','novice': 1473410047531},
// 'E34S47': {'status': 'normal','novice': 1469878194386,'own': {'user': '55c420d77cd79116190a7f53','level': 6}},
// 'E34S48': {'status': 'normal','novice': 1469878194386},
// 'E34S49': {'status': 'normal','novice': 1469878194386,'own': {'user': '5797f9922702461612c84824','level': 6}},
// 'E34S50': {'status': 'normal'},
// 'E34S51': {'status': 'normal','novice': 1473410047531},
// 'E35S47': {'status': 'normal','openTime': '1469878194386'},
// 'E35S48': {'status': 'normal','openTime': '1469878194386','own': {'user': '576c3c04c729f0674fba7137','level': 3}},
// 'E35S49': {'status': 'normal','openTime': '1469878194386'},
// 'E35S50': {'status': 'normal'},
// 'E35S51': {'status': 'normal','novice': 1473410047531,'openTime': '1472546047531'}},
// )
// '55c420d77cd79116190a7f53': {'_id': '55c420d77cd79116190a7f53','username': 'Phlosioneer','badge': {'type': 13,'color1': 34,'color2': 21,'color3': 60,'param': 0,'flip': false}},'576c3c04c729f0674fba7137': {'_id': '576c3c04c729f0674fba7137','username': 'drowsysaturn','badge': {'type': 23,'color1': '#000000','color2': '#dda955','color3': '#f0ff99','param': -12,'flip': true}},'577a76542fe3a52e25d9116c': {'_id': '577a76542fe3a52e25d9116c','username': 'GalaDOS','badge': {'type': 21,'color1': '#04127a','color2': '#3adb1e','color3': '#3adb1e','param': 15,'flip': false}},'577ae96c2fe3a52e25d98ed0': {'_id': '577ae96c2fe3a52e25d98ed0','username': 'Einandermal','badge': {'type': 18,'color1': '#00ce98','color2': '#4f5370','color3': '#4f5370','param': -100,'flip': false}},'577bc02e47c3ef7031adb268': {'_id': '577bc02e47c3ef7031adb268','username': 'ags131','badge': {'type': 12,'color1': '#ff7000','color2': '#0000ff','color3': '#000000','param': 0,'flip': false}},'577bedb847c3ef7031adeafc': {'_id': '577bedb847c3ef7031adeafc','username': 'Snorry','badge': {'type': 15,'color1': '#ebc1ad','color2': '#5b2e6b','color3': '#71d926','param': 31,'flip': true}},'577efca9117b990b43842062': {'_id': '577efca9117b990b43842062','username': 'Uplink','badge': {'type': 9,'color1': '#705858','color2': '#ffffff','color3': '#8e2828','param': -97,'flip': false}},'578963743fd9069e6b558762': {'_id': '578963743fd9069e6b558762','username': 'santus20111','badge': {'type': 18,'color1': '#191aa5','color2': '#5555dd','color3': '#9999ff','param': -58,'flip': false}},'5797f9922702461612c84824': {'_id': '5797f9922702461612c84824','username': 'Nightmare','badge': {'type': 10,'color1': '#7d2cc1','color2': '#f0ff00','color3': '#260733','param': -43,'flip': false}},'57ab4c1bae69c93177567c75': {'_id': '57ab4c1bae69c93177567c75','username': 'mischief901','badge': {'type': 9,'color1': '#4ea7d9','color2': '#ffffff','color3': '#33c745','param': -2,'flip': false}}}})
})

function roomStatus (room) {
  return { _id: room, status: 'normal', novice: 0 }
}

app.post('/place-spawn', (req, res) => {
  let s = req.body
  let obj = {
    type: 'spawn',
    name: s.name,
    x: s.x,
    y: s.y,
    user: req.user._id,
    room: s.room,
    energy: C.SPAWN_ENERGY_START,
    energyCapacity: C.SPAWN_ENERGY_CAPACITY,
    hits: C.SPAWN_HITS,
    hitsMax: C.SPAWN_HITS,
    spawning: null
  }
  Promise.all([
    req.db.users.update({ _id: id }, { $set: { worldStatus: 'normal' }}),
    req.db.roomObjects.update({ type: 'controller', room: s.room }, { $set: {
        progress: 0,
        ticksToDowngrade: C.CONTROLLER_DOWNGRADE[1],
        user: req.user._id,
        level: 1,
        reservation: null,
        downgradeTime: null
    } }),
    req.db.roomObjects.insert(obj)
  ]).then(resp => res.success({
    newbie: false,
    obj,
  resp}))
    .catch(err => res.fail())
})

app.post('/add-object-intent', (req, res) => {
  let uid = req.user._id
  let b = req.body
  req.db.roomIntents.findOne({ room: b.room })
    .then(resp => {
      if (!resp)
        resp = { room: b.room }
      resp.users = resp.users || {}
      resp.users[uid] = resp.users[uid] || { objects: {} }
      resp.users[uid].objects[b._id] = resp.users[uid].objects[b._id] || {}
      resp.users[uid].objects[b._id][b.name] = b.intent
      return resp
    })
    .then(resp => req.db.roomIntents.update({ room: b.room }, {$set: resp}, {upsert: true}))
    .then(resp => res.success({ result: resp }))
    .catch(err => res.fail(err))
})
