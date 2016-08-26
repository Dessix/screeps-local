const express = require('express')
let app = module.exports = express.Router()

app.get('/seasons', (req, res) => {
  res.success({ seasons: [{'_id': '2016-08','name': 'August 2016','date': '2016-08-01T00:00:05.880Z'}] })
})

app.get('/find', (req, res) => {
  switch (req.query.mode) {
    case 'world':
      res.success({
        '_id': '579e91156cb50b7bd8f9af83',
        'season': '2016-08',
        'user': '577bc02e47c3ef7031adb268',
        'score': 0,
        'rank': 0
      })
      break
    case 'power':
      res.fail('result not found')
      break
  }
})
