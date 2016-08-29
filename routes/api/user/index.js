const express = require('express')
let app = module.exports = express.Router()

app.use('/overview', (req, res) => {
  if (!req.user) return res.fail()
  req.db.rooms.find({ 'own.user': req.user._id }, (err, rooms) => {
    res.success({
      'rooms': rooms.map(r => r._id),
      'stats': {'E33S49': []},
      'statsMax': 25400,
      'totals': {'creepsProduced': 0,'energyHarvested': 0,'energyConstruction': 0,'energyControl': 0,'energyCreeps': 0},
      'gametimes': [null, null, null, null, null, null, null, null, null]
    })
  })
})

app.get('/messages/unread-count', (req, res) => {
  res.success({ count: 0 })
})

app.get('/world-status', (req, res) => {
  if (!req.user) res.end('', 401)
  res.success({ status: req.user.worldStatus || 'empty' })
})

app.get('/world-start-room', (req, res) => res.success({'ok': 1,'room': ['E5S5']}))

app.get('/respawn-prohibited-rooms', (req, res) => res.success({rooms: []}))

app.get('/branches', (req, res) => {
  req.db['users.code'].findOne({ _id: req.user._id }, (err, code) => {
    // res.success({ list: req.user.branches })
    res.success({ list: code.branches })
  })
})

app.post('/set-active-branch', (req, res) => {
  req.db['users.code'].findOne({ _id: req.user._id }, (err, code) => {
    code.branches.forEach(b => {
      b.activeWorld = b.activeSim = (req.body.branch == b.branch)
    })
    req.db['users.code'].update({ _id: req.user._id }, code, () => res.success())
  })
})

app.post('/console', (req, res) => {
  req.db.userCode.findOne({ _id: req.user._id})
    .then(rec => {
      if (!rec.consoleCommands)
        rec.consoleCommands = []
      rec.consoleCommands.push(req.body)
      return req.db.userCode.update({ _id: req.user._id }, rec)
    })
  res.success()
})

app.get('/code', (req, res) => {
  let branch = req.query.branch
  let ret = {}
  req.db['users.code'].findOne({ _id: req.user._id }, (err, code) => {
    if (err) res.fail()
    ret = code.branches.find(b => b.activeSim)
    res.success(ret)
  })
})

app.post('/code', (req, res) => {
  let ret = {}
  req.db['users.code'].findOne({ _id: req.user._id }, (err, code) => {
    if (err) res.fail()
    let b = code.branches.find(b => b.branch == req.body.branch)
    if (b) {
      b.modules = req.body.modules
      b.timestamp = Date.now()
    }
    else
      code.branches.push({ branch: req.body.branch, modules: req.body.modules, activeSim: false, activeWorld: false, timestamp: Date.now() })
    req.db['users.code'].update({ _id: req.user._id }, code, () => res.success())
  })
})

app.post('/badge', (req, res) => {
  req.db.users.update({ _id: req.user._id }, { $set: { badge: req.body.badge }})
  res.success()
})

app.get('/memory', (req, res) => {
  let path = req.query.path.split('.')
  let mem = req.user.memory
  try {
    while(path.length)
    mem = mem[path.splice(0, 1)[0]]
  } catch(e) {}
  console.log(mem)
  res.success({ memory: mem })
})
