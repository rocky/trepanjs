// Copyright 2015 Rocky Bernstein
var mod = require('module'),
    fs = require('fs'),
    net = require('net'),
    util = require('util');

function resolveFile(path) {
    try {
	fs.statSync(path);
    } catch (e) {
	var tryPath = mod._findPath(path, mod.globalPaths);
	if (tryPath) {
	    return util.format("%s [%s]", tryPath, path);
	}
    }
    return path;
}
exports.resolveFile = resolveFile;

var portInUse = function(port, callback) {
    var server = net.createServer(function(socket) {
	socket.write('Echo server\r\n');
	socket.pipe(socket);
    });

    server.listen(port, '127.0.0.1');
    server.on('error', function (e) {
	callback(true);
    });
    server.on('listening', function (e) {
	server.close();
	callback(false);
    });
};
exports.portInUse = portInUse;
