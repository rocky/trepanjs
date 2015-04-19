"use strict";
// Copyright 2015 Rocky Bernstein
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var nopt = require('nopt'),
    intf = require('./interface'),
    util = require('util')
    ;

exports.main = function(argv, stdin, stdout) {
    var knownOpts = {'highlight': Boolean,
		     'port':  Number,
		     'host':  String,
		     'p': Number,
		    },
	parsed = nopt(knownOpts, null, argv, 0);
    if (parsed.argv.remain.length < 1) {
	console.error('Usage: trepanjs [opts] [--] <script.js> [script.js options]');
	process.exit(1);
    }
    if (parsed.highlight == null) { parsed.highlight = true; }

    // Setup input/output streams
    stdin = stdin || process.stdin;
    stdout = stdout || process.stdout;

    parsed
    var args = ['--debug-brk'].concat(argv),
	interface_ = new intf.Interface(stdin, stdout, parsed);

    stdin.resume();

    process.on('uncaughtException', function(e) {
	console.error("There was an internal error in the trepanjs" +
		      ' debugger. " Please report this bug.');
	console.error(e.message);
	console.error(e.stack);
	if (interface_.child) interface_.child.kill();
	process.exit(1);
    });
};
