const {EventEmitter} = require('events')

const game = require('../.engine/game/game')
const cons = require('../.engine/game/console')
const runtimeGlobals = require('../.engine/core/runtime-user-globals')

class Runtime {
  constructor () {
    this.globals = {}
    this.globalTimestamps = {}
  }
  getGlobals (id) {
    return this.globals[id] = this.globals[id] || {}
  }
  initGlobals (id, data) {
    let g = this.getGlobals(id)
    if (data) {
      for (let k in data)
        g[k] = data[k]
    }
  }
  checkObsolete (id, timestamp) {
    if (!this.globalTimestamps[id] || this.globalTimestamps[id] < timestamp)
      delete this.globals[id]
    this.globalTimestamps[id] = timestamp
  }
  processUser (data) {
    if (!data.user) return
    // console.log(data.roomObjects)
    let user = data.user
    this.checkObsolete(user._id, data.userCodeTimestamp)
    this.initGlobals(user._id)
    let mem = {
      get: function () {
        return data.userMemory
      },
      set: function (v) {
        if (typeof v != 'string') throw new Error('Raw memory value is not a string')
        delete this._parsed
        data.userMemory = v
      }
    }
    let ret = {}
    let intents = this.getList()
    try {
      game.runCode(this.getGlobals(user._id), data.userCode, data, intents, mem, cons.makeConsole(user._id),
        data.consoleCommands, data.cpu,
        function () {
          return 0
        },
        function () {})
      ret = {
        type: 'done'
      }
    } catch(e) {
      ret = {
        type: 'error',
        error: e.stack || e.toString()
      }
    }
    ret.intents = intents.list
    if (mem._parsed)
      data.userMemory = JSON.stringify(mem._parsed)
    ret.memory = data.userMemory
    ret.console = {
      log: cons.getMessages(user._id),
      results: cons.getCommandResults(user._id)
    }
    return ret
  }
  getList () {
    return {
      list: {},
      set: function (oid, intent, params) {
        this.list[oid] = this.list[oid] || {}
        this.list[oid][intent] = params
      },
      push: function (intent, params, max) {
        this.list[intent] = this.list[intent] || []
        if (this.list[intent].length >= max)
          return false
        this.list[intent].push(params)
        return true
      },
      pushByName: function (oid, intent, params, max) {
        this.list[oid] = this.list[oid] || {}
        this.list[oid][intent] = this.list[oid][intent] || []
        if (max && this.list[oid][intent].length >= max)
          return false
        this.list[oid][intent].push(params)
        return true
      },
      remove: function (oid, intent) {
        if (!this.list[oid][intent]) return false
        delete this.list[oid][intent]
        return true
      }
    }
  }
}

module.exports = Runtime
