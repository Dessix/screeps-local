const express = require('express')
let app = module.exports = express.Router()

app.get('/check-username', (req, res) => {
  let { username } = req.query
  if (!username || !username.match(/[a-zA-Z0-9]{3,}/)) {
    return res.fail('invalid username')
  }
  req.db.users.findOne({ username}, (err, user) => {
    if (user)
      return res.fail('exists')
    else
      return res.success({})
  })
})

app.get('/check-email', (req, res) => {
  let { email } = req.query
  if (!email || !email.match(/.+@.+\..+/)) {
    return res.fail('invalid email')
  }
  req.db.users.findOne({ email}, (err, user) => {
    if (user)
      return res.fail('exists')
    else
      return res.success({})
  })
})

app.post('/submit', (req, res) => {
  let user = req.body
  req.auth.createPassword(user.password, (err, pass) => {
    user.password = pass
    delete user.recaptcha
    req.db.users.ensureIndex({ fieldName: 'email', unique: true })
    req.db.users.ensureIndex({ fieldName: 'username', unique: true })
    user.worldStatus = 'empty'
    user.subscription = true
    user.cpu = 100

    req.db.users.insert(user)
      .then(user => {
        req.db.userCode.insert({
          _id: user._id,
          branches: [ {
            'branch': 'default',
            'activeSim': true,
            'activeWorld': true,
            'modules': {
              'main': 'module.exports.loop = function(){ \n    console.log("tick",Game.time)\n}'
            },
            'timestamp': 1472045040380
          } ],
          consoleCommands: []
        })
        req.db.userMemory.insert({
          _id: user._id,
          memory: '{}'
        })
      })
    res.success()
  })
})
