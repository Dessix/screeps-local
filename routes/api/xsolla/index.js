const express = require('express')
let app = module.exports = express.Router()

app.post('/coupon', (req, res) => {
  if (req.body.code == 'local') {
    req.db.users.update({ _id: req.user._id }, { $set: { subscription: true, cpu: 10 }})
    res.success()
  }else
    res.fail()
})
