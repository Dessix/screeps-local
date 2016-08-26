
  let a = require
  let b = module 
  let c = module.exports
  ;var d = [];
self.onmessage = function(b)
{
  if ("launch" == b.data.type)
  {
    switch (b.data.name)
    {
      case "main":
        a("../.engine/main.js");
        break;
      case "runner":
        a("../.engine/runner.js");
        break;
      case "processor":
        a("../.engine/processor.js");
        break;
      case "runtime":
        a("../.engine/core/runtime.js")
    }
    d.forEach(function(a)
    {
      self.onmessage(a)
    })
  }
  else d.push(b)
}

  