module.exports = {
  jwtsecret: 'screeps-secret', // Change this to secure your logins
  redis: {
    // TODO: Actually use this!
  },
  mongo: {
    uri: process.env.MONGO_URI || 'localhost/screeps-local'
  },
  recaptcha: {
    // only valid for localhost and my domain
    // Server side ignored currently ;)
    sitekey: '6LfxwycTAAAAADuiVXiBLAKmzaWVHeMsbsZkjwxv'
  },
  constants: require('./engine/.engine/game/constants.js')
}
