'use strict'
const vm = require('vm')
const fs = require('fs')
const path = require('path')

class ModuleWrapper {
  constructor (rootmodule) {
    let self = this
    let name = path.basename(rootmodule)
    this.remap = []
    this.remap.push({
      regex: /PathFinding\.js/,
      func: (fn) => fn.indexOf('engine') == -1 ? fn.replace(/PathFinding\.js/, 'engine/PathFinding.js') : fn
    })
    this.global = {
      name: name,
      __dirname: __dirname,
      __filename: __filename,
      require: (module) => this.vmrequire(module, __dirname),
      setTimeout: setTimeout,
      setInterval: setInterval,
      clearTimeout: clearTimeout,
      clearInterval: clearInterval,
      console: {
        log: (...d) => console.log(`${name}`, ...d),
        error: (...d) => console.error(`${name}`, ...d)
      }
    }
    this.context = vm.createContext(this.global)
    this.rootmodule = rootmodule
    this.name = name
  }
  start () {
    return this.vmrequire(this.rootmodule, __dirname)
  // this._ret = this.script.runInContext(this.context, { displayErrors: true })
  }
  vmrequire (module, dname) {
    this.moduleCache = this.moduleCache || {}
    if (module.match(/^\.?\.?\//)) {
      let fn = path.resolve(dname, module)
      if (fn.slice(-1) == '/') fn += 'index.js'
      if (fn.slice(-3) != '.js') fn += '.js'
      // if (fn == '/home/adam/projects/node/screeps-sim/engine/.engine/game/rooms.js')
      /* START REMAPING */
      let remap = this.remap.find(r => r.regex.test(fn))
      if (remap) {
        if (remap.exports)
          return remap.exports
        if (remap.replace)
          fn = fn.replace(r.regex, remap.replace)
        if (remap.func)
          fn = remap.func(fn)
      }
      /* END REMAPING */
      if (this.moduleCache[fn])
        return this.moduleCache[fn].exports
      let mod = new Proxy({}, {})
      mod.exports = {}
      this.moduleCache[fn] = mod

      let filename = fn
      let dirname = path.dirname(fn)
      let raw = fs.readFileSync(fn)
      let code = `(function (require, exports, module, __filename, __dirname) { ${raw} })`
      let script = new vm.Script(code, {
        filename: filename,
        displayErrors: true
      })
      let require = (m) => this.vmrequire(m, dirname)
      script.runInContext(this.context)(require, mod.exports, mod, filename, dirname)
      return mod.exports
    }else {
      return require(module)
    }
  }
}
module.exports = ModuleWrapper
