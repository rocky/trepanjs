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

// This class is the repl-enabled debugger interface.

var assert = require('assert'),
    util = require('util'),
    clientSide = require('./client'),
    cmds = require('./cmds'),
    columnize = require('./columnize'),
    inherits = util.inherits,
    misc = require('./misc'),
    path = require('path'),
    repl = require('./repl'),
    terminal = require('./terminal'),
    utilCompat  = require('./utilcompat'),
    vm = require('vm'),
    spawn = require('child_process').spawn;

function Interface(stdin, stdout, args) {
    var self = this;

    this.stdin = stdin;
    this.stdout = stdout;

    this.listSize = 10;

    this.args = args;
    // Two eval modes are available: controlEval and debugEval
    // But controlEval is used by default
    this.opts = {
	prompt: '(trepanjs) ',
	input: this.stdin,
	output: this.stdout,
	eval: this.controlEval.bind(this),
	useGlobal: false,
	termHighlight: args.highlight,
	displayWidth: columnize.computedDisplayWidth(),
	useColors: args.highlight,
	ignoreUndefined: true
    };

    if (parseInt(process.env['NODE_NO_READLINE'], 10) ||
	!this.opts.termHighlight) {
	this.opts.terminal = false;
    } else if (parseInt(process.env['NODE_FORCE_READLINE'], 10)) {
	this.opts.terminal = true;

	// Emulate Ctrl+C if we're emulating terminal
	if (!this.stdout.isTTY) {
	    process.on('SIGINT', function() {
		self.repl.rli.emit('SIGINT');
	    });
	}
    }
    if (parseInt(process.env['NODE_DISABLE_COLORS'], 10) ||
	!this.opts.termHighlight) {
	this.opts.useColors = false;
	this.opts.termHighlight = false;
    }
    /*
    if (this.opts.termHighlight) {
	this.opts.prompt = terminal.underline(this.opts.prompt);
    }
    */
    this.repl = repl.start(this.opts);

    // Do not print useless warning
    repl._builtinLibs.splice(repl._builtinLibs.indexOf('repl'), 1);

    // Kill child process when main process dies
    this.repl.on('exit', function() {
	process.exit(0);
    });

    // Handle all possible exits
    process.on('exit', this.killChild.bind(this));
    process.once('SIGTERM', process.exit.bind(process, 0));
    process.once('SIGHUP', process.exit.bind(process, 0));

    this.commands = {};
    this.aliases = {};
    cmds.defineCommands(this, Interface);

    this.killed = false;
    this.waiting = null;
    this.paused = 0;
    this.context = this.repl.context;
    this.history = {
	debug: [],
	control: []
    };
    this.breakpoints = [];
    this._displays = [];
    this.backtraceIndex = 0;

    // Run script automatically
    this.pause();


    var proto = Interface.prototype,
	use = ['step', 'next', 'finish'];

    // Copy "use" prototype methods into repl context
    // Setup them as getters if possible.
    for (var name in proto) {
	if (Object.prototype.hasOwnProperty.call(proto, name) &&
            use.indexOf(name) != -1) {
	    this.defineProperty(name, proto);
	}
    }

    // XXX Need to figure out why we need this delay
    setTimeout(function() {
	self.commands['run'].run((function() {
	    self.resume();
	}));
    }, 10);
}

exports.Interface = Interface;

// Add a debugger command or alias to the
// list of commands the REPL understands.
// OLDER Inteface that is going away.
Interface.prototype.defineProperty = function(cmdName, proto) {
    // Check arity
    var fn = proto[cmdName].bind(this);

    if (proto[cmdName].length === 0) {
	Object.defineProperty(this.repl.context, cmdName, {
	    get: fn,
	    enumerable: true,
	    configurable: false
	});
    } else {
	this.repl.context[cmdName] = fn;
    }
};

// Add a debugger command or alias to the
// list of commands the REPL understands.
// NEWER interface.
Interface.prototype.defineCommand = function(cmdName, cmd) {
    if (!utilCompat.isFunction(cmd.run)) {
	throw new Error('bad argument, "run "field must be a function');
    }
    var fn = cmd.run;
    cmd.name = cmdName;
    this.repl.context[cmdName] = fn;
    this.commands[cmdName] = cmd;
    if (cmd.aliases) {
	for (var i in cmd.aliases) {
	    this.aliases[cmd.aliases[i]] = cmd;
	};
    } else {
	cmd.aliases = [];
    }
};

// Debugger commands handling stream control

Interface.prototype.pause = function() {
    if (this.killed || this.paused++ > 0) return this;
    this.repl.rli.pause();
    this.stdin.pause();
    return this;
};

Interface.prototype.resume = function(silent) {
    if (this.killed || this.paused === 0 || --this.paused !== 0)
	return this;
    this.repl.rli.resume();
    if (silent !== true) {
	this.repl.displayPrompt();
    }
    this.stdin.resume();

    if (this.waiting) {
	this.waiting();
	this.waiting = null;
    }
    return this;
};

// Clear current line
Interface.prototype.clearline = function() {
  if (!this.repl.termHighlight) {
    this.stdout.cursorTo(0);
    this.stdout.clearLine(0);
    this.stdout.write('\r');
  } else if (this.stdout.isTTY) {
    this.stdout.cursorTo(0);
    this.stdout.clearLine(1);
  } else {
    this.stdout.write('\b');
  }
};

// Print text to output stream
Interface.prototype.print = function(text, oneline) {
    if (this.killed) return;
    this.clearline();

    this.stdout.write(utilCompat.isString(text) ?
		      text : util.inspect(text));

    if (oneline !== true) {
	this.stdout.write('\n');
    }
};

// Print markdown text to output stream
Interface.prototype.markupPrint = function(text) {
    if (this.repl.useColors) {
	this.print(terminal.markup(text), true);
    } else {
	this.print(text, oneline);
    }
};

// Debugger's `break` event handler
Interface.prototype.handleBreak = function(r) {
    var self = this;

    this.pause();

    // Save execution context's data
    this.client.currentSourceLine = r.sourceLine;
    this.client.currentSourceLineText = r.sourceLineText;
    this.client.currentSourceColumn = r.sourceColumn;
    this.client.currentFrame = 0;
    this.client.currentScript = r.script && r.script.name;

    this.lastListLine = r.sourceLine + 1;

    // Print break data
    this.print(SourceInfo(r));

    // Show displays' values
    this.displays(true, function(err) {
	if (err) return self.error(err);

	// And list source
	self.commands['list'].run(self.lastListLine-1, self.lastListLine+1);
	self.lastListLine -= 3;

	self.resume(true);
    });
};

// Internal method for checking connection state
Interface.prototype.requireConnection = function() {
  if (!this.client) {
    this.error("App isn't running... Try `run` to start it");
    return false;
  }
  return true;
};

function trimWhitespace(cmd) {
  var trimmer = /^\s*(.+)\s*$/m,
      matches = trimmer.exec(cmd);

  if (matches && matches.length === 2) {
    return matches[1];
  }
  return '';
}

/*=================================
    Eval functions and commands
==================================*/

// Used for debugger's commands evaluation and execution
Interface.prototype.controlEval = function(code, context, filename,
					   callback) {
    var showCallback = true;
    try {
	// Repeat last command if empty line are going to be evaluated
	this.repl.rli.history = this.repl.rli.history || [];

	if (code === '\n') {
	    if (this.repl.rli.history.length > 0) {
		code = this.repl.rli.history[0] + '\n';
	    }
	} else {
	    var needed = ((this.repl.rli.history.length == 0) ||
			  (this.repl.rli.history[0] != code));
	    if (needed) {
		this.repl.rli.history.unshift(code);
	    }
	}

	this.code = code;
	this.cmdName = trimWhitespace(code).split(/[ (]/)[0];
	if (this.cmdName in this.aliases) {
	    var cmd = this.aliases[this.cmdName];
	    code = code.replace(this.cmdName, cmd.name);
	}
	if (this.cmdName in this.commands) {
	    var cmd = this.commands[this.cmdName];
	    if (cmd.connection && !this.requireConnection()) {
		showCallback = false
		this.error(util.format('This command, "%s" requires a running program',
				       this.cmdName))
		throw new Error();
	    }
	}

	// console.log(code); // XXX debug
	var result = vm.runInContext(code, context, filename);
	// console.log(utilCompat.isFunction(result)); // XXX debug
	if (utilCompat.isFunction(result)) {
	    result = result();
	}

	// Repl should not ask for next command
	// if current one was asynchronous.
	if (this.paused === 0) return callback(null, result);

	// Add a callback for asynchronous command
	// (it will be automatically invoked by .resume() method
	this.waiting = function() {
	    callback(null, result);
	};
    } catch (e) {
	if (showCallback) {
	    callback(e);
	} else {
	    callback(null);
	}
    }
};

// Used for debugger's remote evaluation: shell and eval() debugger commands
Interface.prototype.debugEval = function(code, context, filename, callback) {
    if (!this.requireConnection()) return;

    var self = this,
	client = this.client;

    // REPL asked for scope variables
    if (code === '.scope') {
	client.reqScopes(callback);
	return;
    }

    var frame = (client.currentFrame == clientSide.NO_FRAME)
	? frame : undefined;

    self.pause();

    // Request remote evaluation globally or in current frame
    client.reqFrameEval(code, frame, function(err, res) {
	if (err) {
	    callback(err);
	    self.resume(true);
	    return;
	}

	// Request object by handles (and it's sub-properties)
	client.mirrorObject(res, 3, function(err, mirror) {
	    callback(null, mirror);
	    self.resume(true);
	});
    });
};

// Step commands generator
Interface.stepGenerator = function(type, count) {
  return function() {
    if (!this.requireConnection()) return;

    var self = this;

    self.pause();
    self.client.step(type, count, function(err, res) {
      if (err) self.error(err);
      self.resume();
    });
  };
};

Interface.prototype.next = Interface.stepGenerator('next', 1);
Interface.prototype.step = Interface.stepGenerator('in', 1);
Interface.prototype.finish = Interface.stepGenerator('out', 1);

// List displays
Interface.prototype.displays = function() {
    var self = this,
	verbose = arguments[0] || false,
	callback = arguments[1] || function() {},
	waiting = this._displays.length,
	values = [];

    this.pause();

    if (!waiting) {
	this.resume();
	return callback();
    }

    this._displays.forEach(function(display, i) {
	self.debugEval(display, null, null, function(err, value) {
	    values[i] = err ? '<error>' : value;
	    wait();
	});
    });

    function wait() {
	if (--waiting === 0) {
	    if (verbose) self.section('Displays:');

	    self._displays.forEach(function(display, i) {
		self.print(utilCompat.leftPad(i, ' ',
					      self._displays.length - 1) +
			   ': ' + display + ' = ' +
			   JSON.stringify(values[i]));
	    });

	    if (verbose) self.print(' ');
	    self.resume();
	    callback(null);
	}
    }
};

// Pause child process
Interface.prototype.pause_ = function() {
    if (!this.requireConnection()) return;

    var self = this,
	cmd = 'process._debugPause();';

    this.pause();
    this.client.reqFrameEval(cmd, clientSide.NO_FRAME, function(err, res) {
	if (err) {
	    self.error(err);
	} else {
	    self.resume();
	}
    });
};


// Terminates the debugged process.
// This is the child of the debugger process.
Interface.prototype.kill = function() {
  if (!this.child) return;
  this.killChild();
};


// Exit debug repl
Interface.prototype.exitRepl = function() {
    // Restore eval
    this.repl.eval = this.controlEval.bind(this);

    // Swap history
    this.history.debug = this.repl.rli.history;
    this.repl.rli.history = this.history.control;

    this.repl.context = this.context;
    this.repl.setPrompt(this.opts.prompt);
    this.repl.displayPrompt();
};


// Move
Interface.prototype.move = function(offset, absolute) {
    if (!this.requireConnection()) return;

    var self = this,
	client = this.client;

    self.pause();
    client.fullTrace(function(err, bt) {
	if (err) {
	    self.error('Can\'t request backtrace now');
	    self.resume();
	    return;
	}

	var finalIndex = (absolute) ? offset : self.backtraceIndex + offset;
	if (finalIndex <= 0) { finalIndex = 0; }
	if (finalIndex >= bt.frames.length) { finalIndex = bt.frames.length - 1; }

	if (finalIndex == self.backtraceIndex) {
	    self.resume();
	    return;
	}

	var finalFrameNative = (finalIndex <= 0) ?
	    false : bt.frames[finalIndex].script.isNative;
	var indexFrameNative =
	    bt.frames[self.backtraceIndex].script.isNative;
	var firstFrameNative = bt.frames[0].script.isNative;

	self.backtraceIndex = finalIndex;
	if (!firstFrameNative && !indexFrameNative && !finalFrameNative) {
	    self.backtraceIndex = finalIndex;
	    var frame = bt.frames[self.backtraceIndex];
	    var script = frame.script.name;
	    var number = frame.line + 1;
	    var line = "break in " + script + ":" + number;
	    self.list(1);
	    self.print(line);
	}

	self.resume();
    });
};

// Up
Interface.prototype.up = function() {
    this.move(1, false);
};

// Down
Interface.prototype.down = function() {
    this.move(-1, false);
};


// Frame
Interface.prototype.frame = function(pos) {
    pos || (pos = 0);
    this.move(pos, true);
};

// Kills child process
Interface.prototype.killChild = function() {
  if (this.child) {
    this.child.kill();
    this.child = null;
  }
  this.backtraceIndex = 0;
  if (this.client) {
    // Save breakpoints
    this.breakpoints = this.client.breakpoints;

    this.client.destroy();
    this.client = null;
  }
};


exports.port = 5858;

    // Spawns child process (and restores breakpoints)
Interface.prototype.trySpawn = function(cb, noWait) {
    var self = this,
	breakpoints = this.breakpoints || [],
	port = this.args.port || exports.port,
	host = 'localhost',
	childArgs = this.args.argv.remain;

    this.killChild();
    assert(!this.child);

    if (this.args.host) {
	// Connecting to remote debugger
	// `node debug localhost:5858`
	host = this.args.host
	this.child = {
            kill: function() {
		// TODO Do we really need to handle it?
            }
	};
    } else if (this.args.p) {
	// `node debug -p pid`
	this.child = {
            kill: function() {
		// TODO Do we really need to handle it?
            }
	};
	process._debugProcess(this.args.p);
    } else {
	if (this.args.port) {
            // Start debugger on custom port
            // `node debug --port=5858 app.js`
            childArgs = ['--debug-brk=' + port].concat(childArgs);
	} else {
            childArgs = ['--debug-brk'].concat(childArgs);
	}
    }

    if (host == 'localhost' && !noWait) {
	var self = this;
	misc.portInUse(port, function(inUse) {
	    if (inUse) {
		throw new Error('Port ' + port + ' is in use. ' +
				'Try another port using --port.')
	    } else {
		self.trySpawn(cb, true);
	    }
	});
	return false;
    }

    this.child = spawn(process.execPath, childArgs);

    this.child.stdout.on('data', this.childPrint.bind(this));
    this.child.stderr.on('data', this.childPrint.bind(this));

    this.pause();

    var client = self.client = new clientSide.Client(),
	connectionAttempts = 0;

    client.once('ready', function() {
	self.stdout.write(' ok\n');

	// Restore breakpoints
	breakpoints.forEach(function(bp) {
	    self.print('Restoring breakpoint ' + bp.scriptReq + ':' +
		       bp.line);
	    self.setBreakpoint(bp.scriptReq, bp.line, bp.condition, true);
	});

	client.on('close', function() {
	    self.pause();
	    self.print('program terminated');
	    self.resume();
	    self.client = null;
	    self.killChild();
	});

	if (cb) cb();
	self.resume();
    });

    client.on('unhandledResponse', function(res) {
	self.pause();
	self.print('\nunhandled res:' + JSON.stringify(res));
	self.resume();
    });

    client.on('break', function(res) {
	self.handleBreak(res.body);
    });

    client.on('exception', function(res) {
	self.handleBreak(res.body);
    });

    client.on('error', connectError);
    function connectError() {
	// If it's failed to connect 4 times then don't catch the next
	// error
	if (connectionAttempts >= 10) {
	    client.removeListener('error', connectError);
	}
	setTimeout(attemptConnect, 500);
    }

    function attemptConnect() {
	++connectionAttempts;
	self.stdout.write('.');
	client.connect(port, host);
    }

    this.child.stderr.once('data', function() {
	setImmediate(function() {
	    self.print('connecting to port ' + port + '..', true);
	    attemptConnect();
	});
    });
    return true;
};

function SourceUnderline(sourceText, position, repl) {
  if (!sourceText) return '';

  var head = sourceText.slice(0, position),
      tail = sourceText.slice(position);

  // Colourize char if stdout supports colours
  if (repl.useColors) {
    tail = tail.replace(/(.+?)([^\w]|$)/, '\u001b[32m$1\u001b[39m$2');
  }

  // Return source line with coloured char at `position`
  return [
    head,
    tail
  ].join('');
}


function SourceInfo(body) {
    var result = (body.exception ? 'exception in ' : 'break in ');

    if (body.script) {
	if (body.script.name) {
	    var name = body.script.name,
		dir = path.resolve() + '/';

	    // Change path to relative, if possible
	    if (name.indexOf(dir) === 0) {
		name = name.slice(dir.length);
	    }

	    result += misc.resolveFile(name);
	} else {
	    result += '[unnamed]';
	}
	result += ':';
	result += body.sourceLine + 1;
    }

    if (body.exception) result += '\n' + body.exception.text;

    return result;
}

/*===================================================
  Printing routines
=====================================================*/
// Format and print text from child process
Interface.prototype.childPrint = function(text) {
    this.print(text.toString().split(/\r\n|\r|\n/g).filter(function(chunk) {
	return chunk;
    }).map(function(chunk) {
	return chunk;
    }).join('\n'));
    this.repl.displayPrompt(true);
};

// Section headings
Interface.prototype.section = function(text) {
    if (this.repl.useColors) {
	this.print(terminal.bolden(text));
    } else {
	this.print(text);
	this.print(Array(text.length+1).join("-"));
    }
};

// Error formatting
Interface.prototype.error = function(text) {
    if (this.repl.useColors) {
	text = terminal.bolden(text)
    } else {
	text = '** ' + text
    }
    this.print(text);
    this.resume();
};
