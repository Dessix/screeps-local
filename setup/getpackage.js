const fs = require('fs')
const os = require('os')
const glob = require('glob')
const path = require('path')
const rimraf = require('rimraf')
const crypto = require('crypto')
const request = require('request')
const decompress = require('decompress')
const decompressUnzip = require('decompress-unzip')

function getVersion (opts) {
  return new Promise((resolve, reject) => {
    console.log('Getting version...')
    request({
      url: 'https://screeps.com/api/version',
      method: 'GET',
      json: true
    }, (err, res, body) => {
      if (err) return reject(err)
      opts.version = body.package
      console.log('Version', body.package)
      resolve(opts)
    })
  })
}

function downloadPackage (opts) {
  return new Promise((resolve, reject) => {
    let pkg = opts.pkg = opts.tmpjoin('package.zip')
    let str = fs.createWriteStream(pkg)
    console.log('Downloading version', opts.version)
    let req = request({
      url: `https://screeps.com/packages/${opts.version}`,
      method: 'GET'
    })
    req.pipe(str)
    req.on('end', () => {
      console.log('Download complete')
      resolve(opts)
    })
  })
}

function decompressPackage (opts) {
  return new Promise((resolve, reject) => {
    opts.pkgdir = path.join(__dirname, '../package')
    rimraf.sync(opts.pkgdir)
    console.log('Decompressing')
    decompress(opts.pkg, opts.pkgdir, {
      plugins: [
        decompressUnzip()
      ]
    }).then((...a) => {
      console.log('Decompression complete')
      resolve(opts)
    }).catch(err => reject(err))
  })
}

function removeExisting (opts) {
  return new Promise((resolve, reject) => {
    console.log('Removing existing package files (If exists)')
    rimraf('../package', (err) => {
      resolve(opts)
    })
  })
}

function mktmp (opts) {
  return new Promise((resolve, reject) => {
    console.log('Creating tmp folder')
    let base = os.tmpdir()
    let part = crypto.randomBytes(16).toString('hex')
    let dir = path.join(base, part)
    fs.mkdirSync(dir)
    opts.tmpdir = dir
    opts.tmpjoin = (tp) => path.join(dir, tp)
    console.log('tmp folder created', dir)
    resolve(opts)
  })
}

function cleanup (opts) {
  return new Promise((resolve, reject) => {
    console.log('Cleaning up')
    rimraf(opts.tmpdir, (err) => {
      resolve(opts)
    })
  })
}

function run () {
  let dbg = (opts) => {
    console.log(opts); return opts}
  return Promise.resolve({})
    .then(getVersion)
    .then(mktmp)
    .then(downloadPackage)
    // .then(dbg)
    .then(removeExisting)
    .then(decompressPackage)
    .then(cleanup)
    .then(() => console.log('All done!'))
    .catch((err) => console.error(err))
}

if (require.main == module)
  run()
