const express = require('express')
const request = require('request')

let app = module.exports = express.Router()

app.get('/add-room', (req, res) => {
  let room = req.query.room
  let data = {}
  Promise.resolve()
    .then(() => get(`https://screeps.com/api/game/room-terrain?encoded=true&room=${room}`))
    .then(resp => {
      data.terrain = resp
      req.db.rooms.ensureIndex({ id: 1}, { unique: true })
      if (!resp.terrain.length) return res.fail({ error: 'No room found', room})
      delete resp.terrain[0]._id
      return Promise.all([
        req.db.rooms.insert({ _id: room, status: 'normal', novice: Date.now() }, {castIds: false }),
        req.db.roomTerrain.insert(resp.terrain[0])
      ]).catch(err => console.error(err))
    })
    .then(() => req.db.roomObjects.remove({ room}))
    .then(() => get(`https://screeps.com/api/game/time`))
    .then(resp => {
      data.time = resp
      let t = resp.time
      t -= 120
      t -= t % 20
      data.history = {
        room: room,
        time: t,
        url: `https://screeps.com/room-history/${room}/${t}.json`
      }
      return get(data.history.url)
    })
    .then(resp => {
      data.history.resp = resp
      let objs = []
      for (let k in resp.ticks[resp.base])
        objs.push(resp.ticks[resp.base][k])
      objs = objs.filter(o => ['source', 'controller', 'mineral'].indexOf(o.type) != -1)
      let con = objs.find(o => o.type == 'controller')
      if (con) {
        delete con.user
        delete con.reservation
        con.level = 0
        con.progress = 0
      }
      return Promise.all(objs.map(o => {
        delete o._id
        return req.db.roomObjects.insert(o)
      })).catch(err => console.log(err))
    })
    .then(() => res.success())
    .catch(error => res.fail({ data, error}))
})

function get (url) {
  console.log(url)
  return new Promise((resolve, reject) => {
    request({
      url: url,
      method: 'GET',
      gzip: true,
      json: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
      }
    }, (err, resp, body) => {
      // console.log(err, body)
      if (err) return reject({ error: err, res})
      resolve(body)
    })
  })
}
