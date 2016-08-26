const express = require('express')
const sockjs = require('sockjs')
const API = require('./wsapi')
let app = new express()
let sock = sockjs.createServer({})
var server = require('http').createServer(app)
const bodyParser = require('body-parser')
let { EventEmitter } = require('events')
const config = require('./config')

var morgan = require('morgan')

let dbs = require('./db')

app.use('/api', morgan('combined'))

app.use((req, res, next) => {
  req.db = dbs
  req.auth = require('./auth')
  req.config = config
  next()
})
let socketBus = new EventEmitter()
sock.on('connection', function (conn) {
  let api = new API(conn, socketBus)
  conn.on('data', function (message) {
    api.ondata(message)
  })
})

sock.installHandlers(server, { prefix: '/socket' })

app.post('/room-update', bodyParser.json(), (req, res) => {
  // console.log(req.body)
  socketBus.emit('room-update', req.body)
})

app.use(express.static('public'))
app.use(express.static('package'))
app.use('/api', require('./routes/api'))

app.post('/memory', bodyParser.json(), (req, res) => {
  // console.log(req.body)
  // socketBus.emit('memory', req.body)
  dbs.users.update({ _id: req.body._id }, { $set: { memory: req.body.memory }})
})
server.listen(process.env.PORT || 8080, () => {
  console.log('Listening on port ' + server.address().port) // Listening on port 8888
})

// require('./ipcserver.js')
