const config = require('./config')
const dbs = require('./db')
const jwt = require('jsonwebtoken')
const NRP = require('node-redis-pubsub')
let { jwtsecret } = require('./config')

const Core = require('./engine/runner/Core.js')
let core = new Core(1000)

class API {
  constructor (conn, bus) {
    this.ps = new NRP({
      host: config.redis.host,
      port: config.redis.port,
      scope: config.redis.scope,
    })
    this.conn = conn
    this.bus = bus
    this.bus.on('room-update', d => {
      this.write(JSON.stringify([`room:${d.room}`, d.data]))
    })
    this.conn.on('disconnected', () => {
      this.ps.quit()
    })
  }
  ondata (message) {
    console.log(message)
    let msg = message.split(' ')
    if (typeof this[msg[0]] == 'function')
      this[msg[0]](...msg.slice(1))
  }
  auth (token) {
    try {
      let user = jwt.verify(token, jwtsecret)
      this.write(`time ${Date.now()}`)
      this.write(`protocol 10`)
      this.write(`package 40`)
      this.write(`auth ok ${token}`)
    } catch(e) {
      this.write(`auth failed`)
    }
  }
  subscribe (path) {
    this.ps.on(path, (d) => {
      // console.log(path, d)
      this.write(JSON.stringify([path, d]))
    })
    let [, room] = path.match(/room:(.+)/) || []
    if (room)
      this.write(JSON.stringify([`room:${room}`, {'objects': {},'info': {'mode': 'world'},'gameTime': 1}]))
  }
  unsubscribe(path){
    this.ps.off(path)
  }
  write (...a) {
    this.conn.write(...a)
  }
}

module.exports = API
