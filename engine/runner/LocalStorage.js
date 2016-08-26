const dbs = require('../../db')
const db = dbs
const ts = Date.now()

class LocalStorage {
  constructor (eb) {
    this.storage = {}
    this.locks = {}
  }
  attach (engine) {
    console.log('LS Attach', engine.name)
    this.put = (k, v) => this.putItem(k, v),
    this.get = (k, v) => this.getItem(k, v),
    this.initArray = (k) => this.get(k).then(v => v ? [] : this.put(k, []))
    engine.remap.push({
      regex: /local-storage/,
      exports: this
    })
    engine.ls = this
    engine.on('data', d => this.handle(engine, d))
  }
  handle (engine, data) {
    // console.log(engine.name, data)
    if (data.type == 'localStorage')
      console.log('REMAP FAILED!!!!')
    if (data.type == 'bulk') {
      data.handled = true
      this.getItem(data.storage).then(stor => {
        data.updates.forEach(up => {
          let item = stor.find(i => i._id == up._id)
          for (let k in up.data)
            item[k] = up.data[k]
        })
        data.inserts.forEach(i => stor.push(i))
        data.removes.forEach(r => {
          let ind = stor.findIndex(i => i._id == r._id)
          if (ind != -1) stor.splice(ind, 1)
        })
        // console.log('bulk', data.storage, data.updates)
        this.putItem(data.storage, stor)
          .then(() => data.reply())
      // console.log('BULK!', data)
      // data.reply()
      })
    }
    if (data.type == 'localStorage') {
      let ret
      if (data.get) {
        // if(data.get.key == 'pendingQueue_rooms')
        // console.log(data.get.value)
        data.handled = true
        return this.getItem(data.get.key, data.lock).then((value) => data.reply({
          get: { value}
        }))
      }
      if (data.put) {
        if (data.put.key.match(/processingQueue_rooms$/))
          ; // console.log(engine.id, !!this.locks[data.put.key] ? 'T' : 'F', data.put.key, data.put.value)
        data.handled = true
        return this.putItem(data.put.key, data.put.value).then((value) => data.reply({
          put: { value}
        }))
      }
      ret.type = data.type
      ret.transactionId = data.transactionId
      engine.send(ret)
    }
  }
  getItem (k, lock = false , dc = 0) {
    // console.log('get', k)
    if (k.match(/Queue/) && this.locks[k])
      return new Promise((resolve, reject) => {
        // console.log('Callback defered due to lock', k, lock, dc)
        setTimeout(() => resolve(this.getItem(k, lock, dc + 1)), 10)
      })
    if (lock) this.locks[k] = true
    // if (this.storage[k]) return Promise.resolve(this.storage[k])
    return dbGetItem(k)
      .then(v => {
        // console.log('GET', k, v)
        return v
      })
      .catch(err => console.error(err))
    return ipc.rpc('localStorage', { 'get': { key: k } })
  // return this.storage[k] || null
  }
  putItem (k, v) {
    // console.log('PUT', k, v)
    // this.storage[k] = v
    if (this.locks[k])
      delete this.locks[k]
    // return Promise.resolve(v)
    return dbPutItem(k, v).catch(err => console.error(err))
      // return ipc.rpc('localStorage', { 'put': { key: k, value: v }})
      .then(d => {
        if (this.locks[k])
          delete this.locks[k]
        return v
      })
  // return this.storage[k] = v, v
  }
}

function dbGetItem (key) {
  return new Promise((resolve, reject) => {
    switch (key) {
      case 'runTimestamp':
        resolve(ts)
        break
      case 'gameinfo':
        resolve({
          mode: 'sim'
        })
        break
      case 'pendingQueue_users':
      case 'processingQueue_users':
      case 'pendingQueue_rooms':
      case 'processingQueue_rooms':
      case 'gametime':
        db.localStorage.findOne({ key: key }, (err, data) => {
          if (err) return reject(err)
          data = data || {}
          // if (key.match(/Queue/i)) console.log('get', key, data.value)
          resolve(data.value || 0)
        })
        break
      case 'transactions':
      case 'rooms':
      case 'rooms.flags':
      case 'rooms.intents':
      case 'rooms.objects':
      case 'rooms.terrain':
      case 'users':
      case 'users.memory':
        db[key].find({}, (err, data) => {
          if (err) return reject(err)
          if (key == 'users') data.forEach(u => delete u.password)
          resolve(data)
        })
        break
      case 'users.code.activeSim':
        console.trace('userscode')
        db['users.code'].find({}, (err, users) => {
          if (err) return reject(err)
          let code = users.map(u => {
            let branch = u.branches.find(b => b.activeSim)
            if (!branch) branch = { modules: { main: 'modules.export.loop = function(){}' }, timestamp: Date.now() }
            branch._id = u._id
            return branch || {
                _id: u._id,
                modules: branch.modules,
                timestamp: branch.timestamp
            }
          })
          console.log(err, code)
          resolve(code)
        })
        break
    }
  })
}
function dbPutItem (key, value) {
  return new Promise((resolve, reject) => {
    switch (key) {
      case 'runTimestamp':
        resolve(ts)
        break
      case 'gameinfo':
        resolve({
          mode: 'sim'
        })
        break
      case 'pendingQueue_users':
      case 'processingQueue_users':
      case 'pendingQueue_rooms':
      case 'processingQueue_rooms':
      case 'gametime':
        db.localStorage.update({ key}, { $set: { value}}, { upsert: true }, (err, data) => {
          if (err) return reject(err)
          resolve()
        })
        break
      case 'rooms':
      case 'rooms.flags':
      case 'rooms.intents':
      case 'rooms.objects':
      case 'rooms.terrain':
      case 'users':
      case 'users.memory':
        // console.log('dbput', key, value)
        let upsert = (obj) => new Promise((resolve, reject) => {
          db[key].update({ _id: obj._id }, { $set: obj }, { castIds: false, upsert: true }, (err) => (err ? reject() : resolve()))
        })
        Promise.all(value.map(v => upsert(v)))
          .then(() => resolve(value))
          .catch((error) => reject(error))
        break
      case 'users.code.activeSim':
        db.users.find({}, (err, users) => {
          if (err) return reject(err)
          resolve(users.map(u => {
            let branch = u.branches.find(b => b.activeSim)
            return {
              _id: u._id,
              modules: branch.modules,
              timestamp: branch.timestamp
            }
          }))
        })
        break
    }
  })
}

module.exports = LocalStorage
