const express = require('express')
const bodyParser = require('body-parser')
let app = module.exports = express.Router()
var jwt = require('express-jwt')

let { jwtsecret } = require('../../config')
app.use(jwt({
  secret: jwtsecret,
  credentialsRequired: false,
  getToken: (req) => {
    return req.headers['x-token'] || null
  }
}))
app.use(bodyParser.json())

app.use((req, res, next) => {
  res.success = function success (data) {
    data = data || {}
    data.ok = 1
    res.json(data)
  }
  res.fail = function fail (error) {
    res.json({ error})
  }
  res.getToken = function getToken (user, cb) {
    const jwt = require('jsonwebtoken')
    let token = jwt.sign({ user}, jwtsecret)
    cb(null, token)
  }
  next()
})

app.use((req, res, next) => {
  if (!req.user) return next()
  req.db.users.findOne({
    _id: req.user.user
  }, (err, user) => {
    req.user = user
    req.user.password = true
    next()
  })
})

app.use('/leaderboard', require('./leaderboard'))
app.use('/game', require('./game'))
app.use('/user', require('./user'))
app.use('/auth', require('./auth'))
app.use('/register', require('./register'))
app.use('/xsolla', require('./xsolla'))

app.use('/unread-count', (req, res) => {
  res.success({ count: 0 })
})

app.get('/addroom', (req, res) => {
  let room = req.query.room
  req.db.rooms.ensureIndex({ id: 1}, { unique: true })
  req.db.rooms.insert({ id: room, status: 'normal', novice: Date.now() }, (err) => {
    console.log(err)
    if (err)
      res.fail()
    else
      res.success()
  })
})
