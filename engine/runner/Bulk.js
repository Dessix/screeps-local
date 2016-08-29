const db = require('./db')
const Q = require('q')
const _ = require('lodash')
class Bulk {
  constructor (col) {
    this.colName = col
    this.col = db[col]
    this._insert = []
    this._update = []
    this._remove = []
  }
  insert (rec) {
    this._insert.push(rec)
  }
  update (a, b) {
    function d (a) {
      for (var b in a)
        '_' != b[0] ? _.isArray(a[b]) ? a[b].forEach(d) : _.isObject(a[b]) && d(a[b]) : delete a[b]
    }
    b = _.cloneDeep(b)
    d(b)
    if (!a.toHexString && typeof a == 'object') {
      b = _.merge(a, b)
      a = a._id
    }
    this._update.push({ id: a, data: b })
  }
  remove (rec) {
    this._remove.push(rec)
  }
  execute () {
    return Q.when().then(() => {
      let arr = []
      arr.push(...this._insert.map(rec => ({
        insertOne: { document: rec }
      })))
      arr.push(...this._update.map(rec => ({
        updateOne: {
          filter: { _id: rec.id },
          update: { $set: rec.data },
          upsert: true
        }
      })))
      arr.push(...this._remove.map(rec => ({
        deleteOne: {
          filter: { _id: rec._id }
        }
      })))
      if (!arr.length) return Q.when()
      console.log(JSON.stringify(arr, null, 2))
      return this.col.bulkWrite(arr)
        .then(res => {
          // console.log(res.toJSON())
        })
        .catch(err => console.error(bulk, err))
    }).catch(err => console.error(bulk, err))
  }
}
module.exports = Bulk
