const express = require('express')
let app = module.exports = express.Router()

app.post('/signin', (req, res) => {
  let { email, password } = req.body
  req.db.users.findOne({ $or: [{ username: email }, { email}] }, (err, user) => {
    if (err)   return res.end(err.stack, 500)
    if (!user) return res.end('Unauthorized (User not found)', 401)
    if (user) {
      req.auth.verifyPassword(password, user.password, (err, valid) => {
        if (valid) {
          res.getToken(user._id, (err, token) => {
            res.success({ token})
          })
        }
        else
          res.end('Unauthorized (Bad password)', 401)
      })
    }
  })
})

app.get('/me', (req, res) => {
  if (req.user) {
    res.success(req.user)
  }
  res.end('', 401)
})
