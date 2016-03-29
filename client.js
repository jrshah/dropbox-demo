"use strict"

let net = require('net')
let JsonSocket = require('json-socket')
let path = require('path')
let child_process = require('child_process');
let fs = require('fs').promise
let request = require('request')
let curlreq = require('curlrequest')

const PORT = 8001
const ROOT_DIR = process.cwd()

let server = net.createServer();
server.listen(PORT);

server.on('connection', function(socket) {
    socket = new JsonSocket(socket);
    socket.on('message', function(message) {
        if (message.event && message.path) {
        	switch(message.event) {
        		case 'addDir':
        			addDirectory(message.path)
        		break;
        		case 'add':
        			addFile(message.path)
        		break;
        		case 'unlinkDir' :
        			removeDirectory(message.path)
        		break;
        		case 'unlink' :
        			removeFile(message.path)
        		break;
        		case 'change' :
        			updateFile(message.path)
        		break;
        		default: break;
        	}
        }
    });
});


function addDirectory(rootpath) {
	let url = rootpath.replace(ROOT_DIR, 'http://127.0.0.1:8000')
	let options = {url: url, method: "PUT"}

	curlreq.request(options, function (err, data) {
		console.log(err)
	})
	console.log("Directory added @ " + rootpath)
}

function addFile(rootpath) {
	let url = rootpath.replace(ROOT_DIR, 'http://127.0.0.1:8000')
	let options = {url: url, method: "PUT"}

	curlreq.request(options, function (err, data) {
		if(err){
			console.log(err)
		}
	})
	console.log("File created @" + rootpath)
}

function removeDirectory(rootpath) {
	let url = rootpath.replace(ROOT_DIR, 'http://127.0.0.1:8000')
	let options = {url: url, method: "DELETE"}

	curlreq.request(options, function (err, data) {
		if(err){
			console.log(err)
		}
	})
	console.log("Directory removed @ " + rootpath)
}

function removeFile(rootpath) {
	let url = rootpath.replace(ROOT_DIR, 'http://127.0.0.1:8000')
	let options = {url: url, method: "DELETE"}

	curlreq.request(options, function (err, data) {
		if(err){
			console.log(err)
		}
	})
	console.log("File removed @ "+ rootpath)
}

function updateFile(rootpath) {
	let url = rootpath.replace(ROOT_DIR, 'http://127.0.0.1:8000')
	let options = {url: url, method: "POST"}

	curlreq.request(options, function (err, data) {
		if(err){
			console.log(err)
		}
	})
	console.log("File updated @ "+ rootpath)
}