'use strict'
const { EventEmitter } = require('events')
const vm = require('vm')
const fs = require('fs')
const path = require('path')

class EngineWrapper extends EventEmitter {
  get id () {
    return this.workerId || 0 // this.engine.pid
  }
  constructor (name) {
    super()
    this.remap = []
    this.remap.push({
      regex: 'message-mux',
      exports: {
        sendMessage: this.processMessage,
        handleMessage: (a) => {
        } // stub!
      }
    })
    this.code = `
      try{
        console.log('Preparing')
        global.onmessage = () => console.log('onmessage stubbed')
        const engine = require('../.engine/index.js')
        console.log('Starting')
        global.onmessage({ data: { type: 'launch', name} })
        global.inter = setInterval(() => {
          console.log('katick')
          if(global.stop) clearInterval(global.inter)
        }, 5e3)
        global.onmessage
      }catch(e){
        console.error(e)
      }
    `
    this.onmessage = () => console.log(this.id, 'onmessage not hooked')
    let self = this
    this.global = {
      name: name,
      __dirname: __dirname,
      __filename: __filename,
      require: (module) => this.vmrequire(module, __dirname),
      setTimeout: setTimeout,
      setInterval: setInterval,
      console: {
        log: (...d) => console.log(`${name} [${this.id}]`, ...d),
        error: (...d) => console.error(`${name} [${this.id}]`, ...d)
      },
      global: {
        navigator: {}, // To fool console class
        postMessage: (msg) => this.handlemessage(msg),
        get onmessage() { return self.onmessage },
        set onmessage(v) {
          console.log('Setting onmessage', self.name, v)
          self.onmessage = v
        },
        // onmessage: () => console.log(this.id, 'onmessage not hooked'),
        processMessage: (msg) => {
          return new Promise((resolve, reject) => {
            msg.reply = (data) => {
              data = data || {}
              return data.error ? reject(data) : resolve(data)
            }
            this.emit('data', msg)
          })
        }
      }
    }
    this.context = vm.createContext(this.global)
    this.script = new vm.Script(this.code, {
      filename: 'core',
      displayErrors: true
    })
    this.name = name
  }
  processMessage (msg) {
    return new Promise((resolve, reject) => {
      msg.reply = (data) => {
        data = data || {}
        return data.error ? reject(data) : resolve(data)
      }
      this.emit('data', msg)
    })
  }
  start () {
    this._ret = this.script.runInContext(this.context, { displayErrors: true })
  }
  vmrequire (module, dname) {
    this.moduleCache = this.moduleCache || {}
    if (module.match(/^\.?\.?\//)) {
      let fn = path.resolve(dname, module)
      if (fn.slice(-1) == '/') fn += 'index.js'
      if (fn.slice(-3) != '.js') fn += '.js'
      // if (fn == '/home/adam/projects/node/screeps-sim/engine/.engine/game/rooms.js')
      if (this.moduleCache[fn])
        return this.moduleCache[fn]
      let remap = this.remap.find(r => fn.match(r.regex))
      if (remap) return remap.exports
      let filename = fn
      let dirname = path.dirname(fn)
      let raw = fs.readFileSync(fn)
      let code = `(function (exports, require, module, __filename, __dirname) { ${raw} })`
      let script = new vm.Script(code, {
        filename: filename,
        displayErrors: true
      })
      let mod = { exports: {} }
      let require = (m) => this.vmrequire(m, dirname)
      script.runInContext(this.context)(mod.exports, require, mod, filename, dirname)
      this.moduleCache[fn] = mod.exports
      return mod.exports
    }else {
      return require(module)
    }
  }
  handlemessage (msg) {
    // msg = JSON.parse(msg)
    msg.reply = (data) => {
      data = data || {}
      data.transactionId = msg.transactionId
      msg.responded = true
      this.send(data)
    }
    // msg.target = this
    this.emit('data', msg)
    if (msg.transactionId && !msg.handled && !msg.responded)
      console.error('reply wasnt sent', msg)
  }

  send (data) {
    try {
      if (this.global.global.workeronmessage)
        this.global.global.workeronmessage({ data})
      else
        this.onmessage({ data})
    } catch(e) {
      console.error(e)
    }
  }
}
module.exports = EngineWrapper
