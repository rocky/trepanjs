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
    util = require('util'),
    trepanjs_version = require('../package.json').version
    ;

function help() {
    console.log('Usage: ' +
		'trepanjs [OPTION]... [--] SCRIPT.js [SCRIPT.js OPTIONS...]\n\
Run a gdb-like debugger in nodejs for Javascript program SCRIPT.js\n\
\n\
options: \n\
     --help          # this help \n\
     -v | --version  # show version and exit \n\
     --port NUMBER   # debugger uses port INTEGER to connect \n\
     --host NAME     # connect to host at IP or DNS NAME \n\
     --highlight | --no-highlight\n\
                     # Use terminal highlighting\n\
     --attach        # attach to an node program in debug mode\n\
\n\
Note that nodejs evironment variables NODE_DISABLE_COLORS, \n\
NODE_FORCE_READLINE and NODE_NO_READLINE change behavior.\n\
If NODE_DISABLE_COLORS is set, --no-highlight is set.\n\
');
    process.exit(100);

}

function version() {
    console.log('trepanjs, version ' + trepanjs_version);
    process.exit(3);
}

exports.main = function(argv, stdin, stdout) {
    var knownOpts = {'highlight': Boolean,
		     'help': Boolean,
		     'attach': Boolean,
		     'version': Boolean,
		     'port':  Number,
		     'host':  String,
		     'pid' : Number,
		    },
	shortHands = {"p": ["--pid"],
		      "v": ["--version"],
		      "?": ["--help"],
		     },
	parsed = nopt(knownOpts, shortHands, argv, 0);
    if (parsed.version) { version() };
    if (parsed.help) { help() };
    if (parsed.argv.remain.length < 1) {
	if (!parsed.attach && !parsed.pid) {
	    console.error("Need to give a script name or use options " +
			  "--attach or --pid");
	    process.exit(1);
	}
    }
    if (parsed.highlight == null) { parsed.highlight = true; }

    // Setup input/output streams
    stdin = stdin || process.stdin;
    stdout = stdout || process.stdout;

    parsed.version = trepanjs_version;
    var interface_ = new intf.Interface(stdin, stdout, parsed);

    stdin.resume();

    process.on('uncaughtException', function(e) {
	if (e.message.indexOf('Port') === 0) {
	    console.error(e.message);
	} else {
	    console.error("There was an internal error in the trepanjs" +
			  ' debugger. " Please report this bug.');
	    console.error(e.message);
	    console.error(e.stack);
	}
	if (interface_.child) interface_.child.kill();
	process.exit(1);
    });
};
