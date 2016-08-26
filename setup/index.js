Promise.resolve()
	.then(()=>console.log('Running getpackage...'))
	.then(()=>require('./getpackage.js')())
	.then(()=>console.log('Running unpackengine...'))
	.then(()=>require('./unpackengine.js')())
	.then(()=>console.log('Done!'))
	.catch(e=>console.error(e))