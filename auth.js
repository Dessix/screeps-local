const crypto = require('crypto')

module.exports = { createPassword, verifyPassword}

function createPassword (password, cb) {
  crypto.randomBytes(256, (err, buf) => {
    let salt = buf.toString('hex').replace(/=/g, '')
    crypto.pbkdf2(password, salt, 10000, 512, 'sha512', (err, key) => {
      if (err) return cb(err)
      key = key.toString('hex')
      cb(err, `${salt}.${key}`)
    })
  })
}

function verifyPassword (password, hash, cb) {
  const [salt, originalKey] = hash.split('.')
  crypto.pbkdf2(password, salt, 10000, 512, 'sha512', (err, key) => {
    if (err) return cb(err)
    key = key.toString('hex')
    cb(null, key == originalKey)
  })
}
