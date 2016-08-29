const _ = require('lodash')
const Q = require('q')
const vm = require('vm')
const db = require('./db')
const Bulk = require('./Bulk')
const {EventEmitter} = require('events')
const NRP = require('node-redis-pubsub')
const ModuleWrapper = require('./ModuleWrapper')
// const Runtime = require('./Runtime')

class EvalCodeError {
  constructor (msg) {
    this.msg = msg
  }
  toString () {
    return this.msg
  }
}

const utils = require('../.engine/utils.js')

class Core extends EventEmitter {
  constructor (tickPeriod = 1000) {
    super()
    this.ps = new NRP({ port: 6379, scope: 'screeps-local' })
    this.queue = require('./Queue')
    this.history = require('../.engine/core/history')
    this.pathFinder = require('../.engine/core/path-finder')
    this.gameInfo = {
      mode: 'custom'
    }
    this.consoleCommands = {
      0: [],
      1: [],
      2: []
    }
    this.tickPeriod = tickPeriod
  }
  getTickPeriod () {
    return Promise.resolve(this.tickPeriod)
  }
  connect (service) {
    console.log('Connect', service)
    return Q.when()
  }
  setupRunner () {
    let mod = new ModuleWrapper('../.engine/runner.js')
    mod.remap.push({
      regex: /core\/core/,
      exports: this
    })
    return mod.start()
  }
  setupProcessor () {
    let mod = new ModuleWrapper('../.engine/processor.js')
    mod.remap.push({
      regex: /core\/core/,
      exports: this
    })
    return mod.start()
  }
  setupMain () {
    let mod = new ModuleWrapper('../.engine/main.js')
    mod.remap.push({
      regex: /core\/core/,
      exports: this
    })
    return mod.start()
  }
  getUserData (id) {
    return db.users.findOne({ _id: id })
  }
  getRuntimeData (id) {
    return Q.all([
      db.users.find({}),
      db.users.findOne({ _id: id }),
      db.userCode.findOne({ _id: id }, { _id: 1, branches: { $elemMatch: { activeWorld: true }}}),
      db.userMemory.findOne({ _id: id }),
      db.rooms.find({}),
      db.roomObjects.find({}),
      db.roomTerrain.find({}),
      db.roomFlags.find({ _id: id }),
      db.transactions.find({}),
      this.getGameTime()
    ]).then(res => {
      let [users, user, usersCode, userMemory, rooms, roomsObjects, roomsTerrain, roomsFlags, transactions, gametime] = res
      let terrainData = roomsTerrain.map(t => {
        let arr = new Uint8Array(2500)
        for (let i = 0;i < arr.length;++i)
          arr[i] = Number(t.terrain.charAt(i))
        return { room: t.room, terrain: arr }
      }).reduce((l, v) => (l[v.room] = v.terrain, l), {})
      let consoleCommands = usersCode.consoleCommands
      usersCode = usersCode.branches[0]
      let ret = {
        time: gametime,
        user: user,
        users: this.mapById(users),
        userCode: usersCode.modules,
        userCodeTimestamp: usersCode && usersCode.timestamp || 0,
        userObjects: this.mapById(roomsObjects.filter(r => r.user == id)),
        roomObjects: this.mapById(roomsObjects),
        rooms: this.mapById(rooms),
        flags: roomsFlags,
        consoleCommands: consoleCommands || [],
        userMemory: userMemory.memory,
        cpu: 300,
        games: {
          world: {
            mode: 'custom'
          }
        },
        transactions: {
          incoming: transactions,
          outgoing: transactions
        },
        staticTerrainData: terrainData,
        sim: false
      }
      // console.log(ret.consoleCommands)
      return ret
    })
      .then(res => (db.userCode.update({ _id: id }, { $set: { consoleCommands: [] }}), res))
  }
  initUserRoomVisibility () {
    return Q.when(null)
  }
  setUserRoomVisibility (a, c) {
    return Q.when(null)
  }
  resetUserRoomVisibility (a) {
    return Q.when(null)
  }
  getAllUsers () {
    return db.users.find({})
  }
  restartAllRuntimes () {
    return Q.when(null)
  }
  makeRuntime (id) {
    return this.getRuntimeData(id)
      .then(rd => {
        if (!this.runtime) {
          let mod = new ModuleWrapper('./Runtime.js')
          mod.remap.push({
            regex: /core\/core/,
            exports: this
          })
          const Runtime = mod.start()
          this.runtime = new Runtime()
        }
        let ret = this.runtime.processUser(rd)
        ret.intents = utils.storeIntents(id, ret.intents, rd)
        if (ret.error) throw ret.error
        return ret
      }).catch(err => console.error(err))
  }
  saveUserMemory (id, memory) {
    return db.userMemory.update({ _id: id }, {$set: {memory}})
  }
  saveUserIntents (id, roomintents) {
    console.log(id, roomintents)
    return db.roomIntents.find().then(intents => {
      for (let k in roomintents) {
        if (k == 'notify') continue
        let h = _.find(intents, { room: k })
        if (!h) {
          h = {
            room: k
          }
          intents.push(h)
        }
        h.users = h.users || {}
        h.users[id] = h.users[id] || {
          objects: {}
        }
        _.merge(h.users[id].objects, roomintents[k])
      }
      return Q.all(intents.map(i => {
        if (i._id)
          return db.roomIntents.update({ _id: i._id }, i)
        else
          return db.roomIntents.insert(i)
      }))
    }).then(() => {
    }).catch(err => {
      console.log('saveUserIntents', id, roomintents)
      console.error(err)
    })
    return
    Q.promise((resolve, reject) => {
      let arr = []
      for (let i in roomintents) {
        if (i == 'notify') continue
        let intents = roomintents[roomName]
        let p = db.roomIntents.findOne({ room: roomName })
          .then(room => {
            room = room || { room: roomName }
            room.users = room.users || {}
            room.users[id] = room.users[id] || {
              objects: {}
            }
            for (let oid in intents)
              intents[oid].timestamp = Date.now()
            room.users[id].objects[oid] = intents[oid]
            return room
          })
          .then((room) => db.roomIntents.update({ room: roomName }, {$set: room }, { upsert: true }))
        arr.push(p)
      }
      resolve(Q.all(arr))
    })
  // return Q.promise((resolve, reject) => {
  //   let arr = []
  //   for (let roomName in roomintents) {
  //     if (roomName == 'notify') continue
  //     let intents = roomintents[roomName]
  //     let p = db.roomIntents.findOne({ room: roomName })
  //       .then(room => {
  //         room = room || { room: roomName }
  //         room.users = room.users || {}
  //         room.users[id] = room.users[id] || {
  //           objects: {}
  //         }
  //         for (let oid in intents)
  //           intents[oid].timestamp = Date.now()
  //           room.users[id].objects[oid] = intents[oid]
  //         return room
  //       })
  //       .then((room) => db.roomIntents.update({ room: roomName }, {$set: room }, { upsert: true }))
  //     arr.push(p)
  //   }
  //   resolve(Q.all(arr))
  // })
  }
  getAllRooms () {
    return db.rooms.find({ status: { $ne: 'disabled' }})
  }
  getRoomIntents (room) {
    return db.roomIntents.findOne({ room})
  }
  getRoomObjects (room) {
    return db.roomObjects.find({ room})
      .then(v => this.mapById(v))
  }
  getRoomFlags (room) {
    return db.roomFlags.find({ room})
  }
  getRoomTerrain (room) {
    return db.roomTerrain.find({ room})
      .then(v => this.mapById(v))
  }
  bulkObjectsWrite () {
    return new Bulk('roomObjects')
  }
  bulkFlagsWrite () {
    return new Bulk('roomFlags')
  }
  bulkUsersWrite () {
    return new Bulk('users')
  }
  bulkTransactionsWrite () {
    return new Bulk('transactions')
  }
  clearRoomIntents (b) {
    return db.roomIntents.remove({ room: b })
  }
  mapById (arr) {
    return arr.reduce((l, v) => (l[v._id] = v, l), {})
  }
  notifyRoomsDone () {
    this.emit('roomsDone')
    return Q.when()
  }
  sendConsoleMessages (id, messages) {
    try {
      console.log(id, messages)
      let p = `user:${id}/console`
      this.ps.emit(p, { messages})
    } catch(e) {
      console.error(e)
    }
  }
  sendConsoleError (id, error) {
    let p = `user:${id}/console`
    ps.emit(p, { error})
  }
  getGameTime () {
    // if (this.gameTime < 1)
    return db.localStorage.findOne({ key: 'gametime' })
      .then(ret => ret.value)
  // else
  // return Q.when(this.gameTime)
  }
  incrementGameTime () {
    this.gameTime++
    return db.localStorage.update({ key: 'gametime' }, { $inc: { value: 1 }})
  }
  getGameInfo (room) {
    return Q.when(this.gameInfo)
    return db.rooms.find({ _id: room })
      .then(res => (console.log(res), res))
      .catch(res => (console.err(res), res))
  }
  saveGameInfo (room, info) {
    return Q.when(null)
    return db.rooms.update({ _id: room }, { $set: info })
  }
  finishGame (a) {}
  sendUsageMetrics (a) {}
  getInterRoom () {
    return db.roomObjects.find({ interroom: { $ne: null }})
  }
  deactivateRoom (a) {
    return Q.when(null)
  }
  saveAccessibleRoomsList () {
    return Q.when(null)
  }
  sendNotification () {
    return Q.when(null)
  }
  getRoomStatsUpdater () {
    return {
      inc: () => {
      },
      save: () => Q.when(null)
    }
  }
  roomsStatsSave () {
    return Q.when(null)
  }
  saveIdleTime () {
    return Q.when(null)
  }
  commitDbBulk (...a) {
    console.log('commitDbBulk', ...a)
    return Q.when(null)
  }
  notifyTickStarted () {
    return Q.when(null)
  }
  flushTimelineStats () {
    return Q.when(null)
  }
  cleanTimelineStats () {
    return Q.when(null)
  }
  getMapGridData () {
    return {}
  }
  mapViewSave () {
    return Q.when(null)
  }
  getRoomInfo (room) {
    // return db.rooms.find({ _id: room })
    return Q.when({})
  }
  sendTickMetrics (metrics) {
    console.log(metrics)
    return Q.when(null)
  }
  evalCode (module, globals, returnValue, timeout = 5000) {
    var window, self, process, exports = module.exports, scopeInject = ''
    for (var i in globals) scopeInject += i + ' = __globals.' + i + ', '
    module.name = module.name.replace(/[^a-zA-Z0-9_]+/g, '')
    try {
      if ('__mainLoop' != module.name)
        module.code = `module.__initGlobals = function() { ${scopeInject.replace(/,/g, ";")} }; __result = ${module.code}`
      let code = `(function __run_${module.name}(__globals){ var ${scopeInject}globals = undefined, __result = \n${module.code};\n return __result; \n}).call(global, globals);`
      let script = new vm.Script(code, {
        filename: module.name,
        displayErrors: true,
        line: 1
      })
      let g = {}
      for (let i in globals) g[i] = globals[i]
      g.module = module
      g.exports = module.exports
      g.global = g
      g.globals = globals
      let context = vm.createContext(g)
      let ret = script.runInContext(context, timeout == Infinity ? {} : {
        timeout: timeout
      })
      if (returnValue) return ret
    } catch (e) {
      console.error(e)
      if (e instanceof EvalCodeError) throw e
      throw new EvalCodeError(e.message)
    }
  }
}
module.exports = Core
