const Q = require('q')
let queues = {}

class Queue {
  constructor () {
    this.pending = []
    this.processing = []
  }
  get empty () {
    return (this.pending.length + this.processing.length) === 0
  }
  static create (name) {
    queues[name] = queues[name] || new Queue()
    return queues[name]
  }
  static resetAll () {
    for (let k in queues) {
      queues[k].reset()
    }
    return Q.when()
  }
  reset () {
    this.pending = []
    this.processing = []
  }
  fetch () {
    return Q.promise((resolve, reject) => {
      let poll = (poll) => {
        if (this.pending.length) {
          let v = this.pending.pop()
          this.processing.push(v)
          resolve(v)
        }else {
          setTimeout(() => poll(poll), 50)
        }
      }
      poll(poll)
    })
  }
  markDone (value) {
    let ind = this.processing.indexOf(value)
    this.processing.splice(ind, 1)
    return Q.when(null)
  }
  add (value) {
    this.pending.unshift(value)
    return Q.when(null)
  }
  addMulti (values) {
    this.pending.unshift(...values)
    return Q.when(null)
  }
  whenAllDone () {
    return Q.promise((resolve, reject) => {
      let poll = (poll) => {
        if (this.empty) resolve()
        else setTimeout(() => poll(poll), 10)
      }
      poll(poll)
    })
  }
  getAffinitySet () {
    return {}
  }
  setAffinitySet (v) {}
}

module.exports = Queue
