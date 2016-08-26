const unpack = require('browser-unpack')
const vm = require('vm')
const rimraf = require('rimraf')
const path = require('path')
const fs = require('fs')
const {js_beautify} = require('js-beautify')
process.chdir(path.resolve(__dirname, '..'))

let packageengine = fs.readFileSync('package/engine.js')
let sandbox = {
  __result: null,
  Blob: function (d) {
    let r = { source: d[0]}
    let ind = r.source.indexOf('\n')
    r.source = r.source.slice(ind)
    beautify(r)
    __result = r.source
    return r
  },
  window: {
    createObjectURL: (d) => d
  }
}
packageengine += `; __result = globalWorkersBlob`
let context = vm.createContext(sandbox)
vm.runInContext(packageengine, sandbox)
// console.log(require('util').inspect(sandbox))
let rawengine = sandbox.__result
// fs.writeFileSync('setup/engine.js', rawengine.source)
// process.exit()

let rows = unpack(rawengine.source)
// console.log(rows)

let idmap = []

let stack = []
stack.push(path.resolve(__dirname, '../engine/entry'))

rimraf.sync(path.resolve(__dirname, '../engine/.engine'))
rimraf.sync(path.resolve(__dirname, '../engine/PathFinding.js'))

searchDeps(rows.find(r => r.entry).id, 'ENTRY', path.resolve(__dirname, '../engine/entry/index.js'))

function searchDeps (id, name, abspath, _r) {
  _r = _r || 0
  if (_r == 10) return
  let r = rows.find(r => r.id == id)
  r.path = abspath
  r.name = name
  console.log('Searching', id, name, _r)
  for (let k in r.deps) {
    let v = r.deps[k]
    // console.log('dep', k, v)
    // // let r = rows.find(r=>r.id == k)
    // // r.name = r.deps[k]
    let dir = path.dirname(k)
    let name = path.basename(k)
    let abs = path.resolve(stack[stack.length - 1], k)
    // console.log('res', dir, name, abs)
    stack.push(path.dirname(abs))
    searchDeps(v, name, abs, _r + 1)
    stack.pop()
  }
}

Promise.all(rows.map(r => new Promise((resolve, reject) => {
  let absdir = path.dirname(r.path)
  let abs = r.path
  require('child_process').exec(`mkdir -p ${absdir}`, (err, stdout, stderr) => {
    console.log(stdout, stderr)
    if (abs.slice(-2) != 'js') abs += '.js'
    beautify(r)
    // Attempt to find a require statement
    requireFix(r)
    fs.writeFile(abs, r.source, () => {
      resolve()
    })
  })
}))).then(() => {
  fs.renameSync(path.resolve('PathFinding.js'), path.resolve('engine/PathFinding.js'))
})

function requireFix (r) {
  r.source = `
  let self = global
  let a = require
  let b = module 
  let c = module.exports
  ;${r.source}
  `
  r.source = r.source.replace(/_process/g, 'process')
}

function beautify (r) {
  r.source = js_beautify(r.source, {
    'allowed_file_extensions': ['js', 'json', 'jshintrc', 'jsbeautifyrc'],

    // Set brace_style
    //  collapse: (old default) Put braces on the same line as control statements
    //  collapse-preserve-inline: (new default) Same as collapse but better support for ES6 destructuring and other features. https://github.com/victorporof/Sublime-HTMLPrettify/issues/231
    //  expand: Put braces on own line (Allman / ANSI style)
    //  end-expand: Put end braces on own line
    //  none: Keep them where they are
    'brace_style': 'expand',

    'break_chained_methods': true, // Break chained method calls across subsequent lines
    'e4x': false, // Pass E4X xml literals through untouched
    'end_with_newline': true, // End output with newline
    'indent_char': ' ', // Indentation character
    'indent_level': 0, // Initial indentation level
    'indent_size': 2, // Indentation size
    'indent_with_tabs': false, // Indent with tabs, overrides `indent_size` and `indent_char`
    'jslint_happy': false, // If true, then jslint-stricter mode is enforced
    'keep_array_indentation': false, // Preserve array indentation
    'keep_function_indentation': false, // Preserve function indentation
    'max_preserve_newlines': 0, // Maximum number of line breaks to be preserved in one chunk (0 disables)
    'preserve_newlines': true, // Whether existing line breaks should be preserved
    'space_after_anon_function': false, // Should the space before an anonymous function's parens be added, "function()" vs "function ()"
    'space_before_conditional': true, // Should the space before conditional statement be added, "if(true)" vs "if (true)"
    'space_in_empty_paren': false, // Add padding spaces within empty paren, "f()" vs "f( )"
    'space_in_paren': false, // Add padding spaces within paren, ie. f( a, b )
    'unescape_strings': false, // Should printable characters in strings encoded in \xNN notation be unescaped, "example" vs "\x65\x78\x61\x6d\x70\x6c\x65"
    'wrap_line_length': 0 // Lines should wrap at next opportunity after this number of characters (0 disables)
  })
}
