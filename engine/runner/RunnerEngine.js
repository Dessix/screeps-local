const EngineWrapper = require('./EngineWrapper.js')

class RunnerEngine extends EngineWrapper {
  constructor () {
    super('runner')
    this.workers = []
    this.on('data', d => {
      try {
        this.handle(d)
      } catch(e) {
        console.error('Error during message handling', e)
      }
    })
    this.timeouts = {}
    this.deathWarrants = []
  }
  processWarrants () {
    while(this.deathWarrants.length)
    this.terminateWorker(this.deathWarrants.pop())
  }
  startWorker (workerId) {
    let cworker = this.workers.find(w => w.workerId == msg.workerId)
    console.log('Start Worker', workerId, !!cworker)
    if (cworker) return cworker
    let worker = new EngineWrapper('runtime')
    this.ls.attach(worker)
    worker.workerId = workerId
    worker.on('data', message => {
      // console.log('WORKER', message)
      this.send({
        type: 'worker',
        workerId: workerId,
        message: message
      })
    })
    worker.start()
    setTimeout(() => this.deathWarrants.push(workerId), 5000)
    this.workers.push(worker)
    return worker
  }
  getWorker (id) {
    return this.workers.find(w => w.workerId == workerId)
  }
  get worker () {
    return this.workers[0] || this.startWorker()
  }
  terminateWorker (workerId) {
    let index = this.workers.findIndex(w => w.workerId == workerId)
    if (index == -1) return
    let worker = this.workers[index]
    // worker.engine.kill()
    worker.global.stop = true
    this.workers.splice(index, 1)
  }
  handle (msg) {
    console.log(msg.type)
    if (msg.type == 'worker') {
      let worker = this.workers.find(w => w.workerId == msg.workerId)
      if (msg.startSrc) worker || this.startWorker(msg.workerId)
      if (msg.message) {
        // console.log('WORKER', msg)
        worker.send(msg.message)
        msg.reply()
      }
      if (msg.terminate) {
        console.log('TERMINATE', msg)
        this.terminateWorker(msg.workerId)
      }
      msg.reply()
    }
    if (msg.type == 'console') {
      // console.log('CONSOLE', msg)
      this.emit('console', msg)
    // Console?
    }
    if (msg.type == 'error') {
      console.log('ERROR', msg)
    // Console?
    }
    if (msg.type == 'timeout') {
      this.timeouts[msg.transactionId] = setTimeout(() => this.send({ transactionId: msg.transactionId }), msg.timeout)
      msg.handled = true
    // console.log('setTimeout', msg)
    }
    // this.send({ transactionId: msg.transactionId })

    if (msg.type == 'clearTimeout') {
      // console.log('clearTimeout', msg)
      clearTimeout(this.timeouts[msg.timeoutTransactionId])
      delete this.timeouts[msg.timeoutTransactionId]
      msg.reply({})
      this.send({ transactionId: msg.timeoutTransactionId, reject: true })
    }
  }
}

module.exports = RunnerEngine
