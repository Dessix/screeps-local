module.exports = {
  jwtsecret: 'screeps-secret', // Change this to secure your logins
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    scope: process.env.REDIS_SCOPE || 'screeps-local',
  },
  mongo: {
    uri: process.env.MONGO_URI || 'localhost/screeps-local'
  },
  recaptcha: {
    // only valid for localhost and my domain
    // Server side ignored currently ;)
    sitekey: '6LfxwycTAAAAADuiVXiBLAKmzaWVHeMsbsZkjwxv'
  }
}

try{
  module.exports.constants = require('./engine/.engine/game/constants.js')
}catch(e){}
