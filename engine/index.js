// Quick and dirty wrapper to pipe events and wrap the engine

global.postMessage = function postMessage (msg) {
  // console.log(`${process.name} [${process.pid}]`, '<', msg)
  process.send(JSON.stringify(msg))
}
global.onmessage = function onmessage (msg) {
  console.log(process.pid, 'onmessage not hooked')
}
process.on('message', (msg) => {
  // console.log(`${process.name} [${process.pid}]`, '>', msg)
  onmessage({ data: JSON.parse(msg) })
})
process.on('disconnected', () => {
  console.log(`${process.name} [${process.pid}]`, 'Parent died, exiting')
  process.exit()
})
const engine = require('./.engine')
setInterval(() => {
}, 10e3)

let name = process.argv[2]
if (name) {
  process.name = name
  onmessage({ data: { type: 'launch', name}})
}
