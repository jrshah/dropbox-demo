"use strict"
require('./helper')
let fs = require('fs').promise
let express = require('express')
let morgan = require('morgan')
let trycatch = require('trycatch')
let wrap = require('co-express')
let bodyParser = require('simple-bodyparser')
let path = require('path')
let mime = require('mime-types')
let archiver = require('archiver')
let archive = archiver('zip')
let rimraf = require('rimraf')
let mkdirp = require('mkdirp')
let chokidar = require('chokidar')
let net = require('net')
let JsonSocket = require('json-socket')

const ROOT_DIR = process.cwd()
const PORT = 8000
const SOCKET_PORT = 8001
const HOST = '127.0.0.1';

function sendHeaders(req, res, next) {
	if (req.stat.isDirectory()) {
      let files = fs.readdir(req.filePath)
      res.body = JSON.stringify(files)
      res.setHeader('Content-Length', res.body.length)
      res.setHeader('Content-Type', 'application/json')
      next()
      return
    }

    res.setHeader('Content-Length', req.stat.size)
    let contentType = mime.contentType(path.extname(req.filePath))
    res.setHeader('Content-Type', contentType)
    next()
}

function setFileMeta (req, res, next) {
	req.filePath = path.resolve(path.join(ROOT_DIR, req.url))
	fs.access(req.filePath, fs.F_OK, function (error) {
		if (error) {
			req.stat = null
			next()
		} else {
			fs.stat(req.filePath).then((status) => {
				req.stat = status
				req.content_type = mime.lookup(req.filePath)
				next()
			})
		}
	})	
}

function setDirDetails(req, res, next) {
	let filePath = req.filePath
	let endsWithSlash = filePath.charAt(filePath.length-1) === path.sep
	let hasExt = path.extname(filePath) !== ''
	req.content_type = mime.lookup(req.filePath) || 'application/x-directory'
	req.isDir = endsWithSlash || !hasExt
	req.dirPath = req.isDir ? filePath : path.dirname(filePath)
	next()
}

function* create(req, res) {
	if (req.isDir) {
		mkdirp.promise(req.dirPath)
		res.end()
	} else {
		if (req.stat) {
			return res.status(405).send("File exists \n")
		}
		try {
			let data = yield fs.open(req.filePath, "wx")
			if(req.body) {
				let data = yield fs.writeFile(filePath, req.body)	
				var stats = yield fs.stat(filePath)
				res.setHeader('Content-Length', stats["size"])
				res.setHeader('Content-Type', mime.lookup(filePath))
			}
			res.send()
		} catch (err) {
			console.error(err.stack)
		}
	}
}

function* update(req, res) {
	if (!req.stat) return res.send(405, 'File does not exist \n')
    if (req.isDir || req.stat.isDirectory()) return res.send(405, 'Path is a directory \n')
	let data = yield fs.writeFile(req.filePath, req.body)
	res.end()
}

function* remove(req, res) {
	if (!req.stat) return res.send(400, 'Invalid Path \n')
	if(req.isDir) {
		rimraf.promise(req.dirPath)
	} else {
		let data = yield fs.unlink(req.filePath)
	}
	res.end()
}

function* read(req, res) {
	if (req.isDir || req.stat.isDirectory()) {

		let filenames = yield fs.readdir(req.filePath)
		if(req.headers && req.headers.accept === 'application/x-gtar') {
			console.log("archive the files")

			archive.on('error', function(err) {
			    res.status(500).send({error: err.message});
			});

			//on stream closed we can end the request
			archive.on('end', function() {
			    console.log('Archive wrote %d bytes', archive.pointer())
			});

			res.attachment('downloadArchive.zip')
			archive.pipe(res)
			archive.directory(req.dirPath)
			archive.finalize()
		} else {
			res.pipe(JSON.stringify(filenames))
		}

	} else {
		let filePath = path.join(ROOT_DIR, req.url)
		let data = yield fs.readFile(filePath)
		res.end(data)	
	}
	
}

function sendMessage(event, Path) {
	let filePath = path.join(ROOT_DIR, Path)
	let socket = new JsonSocket(new net.Socket()); //Decorate a standard net.Socket with JsonSocket 
	socket.connect(SOCKET_PORT, HOST);
	socket.on('connect', function() { //Don't send 
	    socket.sendMessage({event: event, path: filePath.replace('server', 'client')})
		// socket.on('message', function(data) {
		// 	console.log(data);
		// })
		socket.on('error', function (error){
			console.log(error)
		})
	});
}


function* main() {
	let app = express()
	app.use(morgan('dev'))

	app.use((req, res, next) => {
        trycatch(next, e => {
            console.log(e.stack)
            res.writeHead(500)
            res.end(e.stack)
        })
    })
    
	app.head('*', setFileMeta, setDirDetails, sendHeaders, (req, res) => res.end())

    app.get('*', setFileMeta,  setDirDetails, wrap(read))
    
    app.put('*', setFileMeta,  setDirDetails, bodyParser(), wrap(create))

  	app.post('*', setFileMeta, setDirDetails, bodyParser(), wrap(update))
    
    app.delete('*', setFileMeta, setDirDetails, wrap(remove))
	
	app.all('*', (req, res) => res.end('hello\n'))

    app.listen(PORT)
    console.log(`LISTENING @ http://127.0.0.1:${PORT}`)


    // One-liner for current directory, ignores .dotfiles 
	chokidar.watch('./', {ignored: /[\/\\]\./}).on('all', (event, path) => {
		console.log("Event " + event + " Path: " + path)
	    sendMessage(event, path)
	});
}



module.exports = main
