"use strict"

let chokidar = require('chokidar')
let net = require('net')
let JsonSocket = require('json-socket')
let Path = require('path')
let crud =  require('./crud')
let wrap = require('co-express')
let bodyParser = require('simple-bodyparser')
let express = require('express')
let morgan = require('morgan')

const PORT = 8000 //The same port that the server is listening on
const SOCKET_PORT = 8001
const HOST = '127.0.0.1';
const ROOT_DIR = process.cwd()

// One-liner for current directory, ignores .dotfiles 
chokidar.watch('./source', {ignored: /[\/\\]\./}).on('all', (event, path) => {
    sendMessage(event, path)
});

function sendMessage(event, path) {
	console.log(path, event)
	let filePath = Path.join(ROOT_DIR, path)
	let socket = new JsonSocket(new net.Socket()); //Decorate a standard net.Socket with JsonSocket 
	socket.connect(SOCKET_PORT, HOST);
	socket.on('connect', function() { //Don't send 
	    socket.sendMessage({event: event, path: filePath})
		socket.on('message', function(data) {
			console.log(data);
		})
		socket.on('error', function (error){
			console.log(error)
		})
	});
}



let app = express()
app.use(morgan('dev'))

app.use((req, res, next) => {
    trycatch(next, e => {
        console.log(e.stack)
        res.writeHead(500)
        res.end(e.stack)
    })
})

//app.head('*', crud.sendHeaders, (req, res) => {res.end()})

app.get('*', setFileMeta,  wrap(read))

app.put('*', bodyParser(), wrap(crud.create))

app.post('*', crud.setFileMeta, bodyParser(), wrap(crud.update))

app.delete('*', crud.setFileMeta, wrap(crud.remove))

app.all('*', (req, res) => res.end('hello\n'))

app.listen(PORT)
console.log(`LISTENING @ http://127.0.0.1:${PORT}`)
