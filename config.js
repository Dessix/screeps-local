module.exports = {
  jwtsecret: 'screeps-secret',
  redis: {},
  mongo: {
    uri: process.env.MONGO_URI || 'localhost/screeps-local'
  },
  constants: require('./engine/.engine/game/constants.js')
}
