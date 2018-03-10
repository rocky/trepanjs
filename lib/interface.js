"use strict";
// Copyright 2015, 2018 Rocky Bernstein
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
    ch = require('consolehighlighter'),
    clientSide = require('./client'),
    cmds = require('./cmds'),
    columnize = require('./columnize'),
    inherits = util.inherits,
    misc = require('./misc'),
    path = require('path'),
    repl = require('./repl'),
    source = require('./source'),
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
  cmds.defineCommands(this);

  this._displays = [];
  this.breakpoints = [];
  this.breakpointHits = [];
  this.backtraceIndex = 0;
  this.context = this.repl.context;
  this.displayWidth = this.opts.displayWidth;
  this.history = {
    debug: [],
    control: []
  };
  this.killed = false;
  this.maxStack = 20;
  this.paused = 0;
  this.waiting = null;

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
// OLDER Interface that is going away.
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
    if (this.stdout.isTTY) {
      this.stdout.cursorTo(0);
      this.stdout.clearLine(0);
    }
    this.stdout.write('\r');
  } else if (this.stdout.isTTY) {
    this.stdout.cursorTo(0);
    this.stdout.clearLine(1);
  } else {
    this.stdout.write('\b');
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
  this.client.brkpts = r.breakpoints;

  this.lastListLine = r.sourceLine + 1;
  this.topScript = this.client.currentScript;

  var brkptsHit = this.client.brkpts;
  if (brkptsHit) {
    brkptsHit.forEach(function(bpNum) {
      if (self.breakpointHits[bpNum] == undefined) {
	self.breakpointHits[bpNum] = 0;
      }
      self.breakpointHits[bpNum] += 1;
    });
  }

  // Print break data
  this.print(source.SourceInfo(r, this.event));

  // Show displays' values
  this.displays(true, function(err) {
    if (err) return self.error(err);

    // And list source
    self.list(self.lastListLine-1, self.lastListLine+1);
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

    var cmd = null,
        tokens =  code.split(/[ \t\n]+/);
    this.code = code;
    this.cmdArgs = tokens.slice(1);

    this.cmdName = trimWhitespace(code).split(/[ (]/)[0];
    if (this.cmdName in this.aliases) {
      cmd = this.aliases[this.cmdName];
      code = code.replace(this.cmdName, cmd.name);
    } else if (this.cmdName in this.commands) {
      cmd = this.commands[this.cmdName];
    }
    if (cmd && cmd.connection && !this.requireConnection()) {
      showCallback = false
      this.error(util.format('This command, "%s" requires a running program',
			     this.cmdName))
      throw new Error();
    }

    // A hack so that command: a b  -> a(b)
    var parts = code.split(/[ \t]+/);
    if (parts.length == 2) {
      var part1 = trimWhitespace(parts[0]),
	  part2 = trimWhitespace(parts[1]);
      if (!part2[0] != '(' &&
	  part2[part2.length-1] != ')') {
	code = part1 + '(' + part2 + ')';
      }
    }

    // console.log(code); // XXX debug
    var result;
    if (cmd) {
      result = vm.runInContext(code, context, filename);
    } else {
      this.debugEval(code, null, null, function(err, value) {
	result = err ? '<error>' : value;
      });
    }
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
Interface.prototype.debugEval = function(code, context, filename,
					 callback) {
  if (!this.requireConnection()) return;

  var self = this,
      client = this.client;

  if (context === 'control') {
    self.controlEval(code, context, filename, callback);
    return
  }

  // REPL asked for scope variables
  if (code === '.scope') {
    client.reqScopes(callback);
    return;
  }

  self.pause();

  // Request remote evaluation in current frame
  // if client.currentFrame is NO_FRAME, then evaluation is global
  client.reqFrameEval(code, client.currentFrame, function(err, res) {
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
    if (!this.requireConnection()) {
      this.error("Need a connection for this command");
      return;
    }

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

function stackSize(bt) {
  var max = bt.frames.length,
      firstFrameNative = bt.frames[0].script.isNative;
  var i = 0;
  for ( ;  i < max; i++) {
    if (!firstFrameNative && bt.frames[i].script.isNative) break;
  }
  return i;
}

// List source-code lines
Interface.prototype.list = function(from, to, frame, bare, silent) {
  var self = this,
      client = this.client,
      scriptName = client.currentScript,
      scriptId = client.script2id[scriptName];

  frame = frame || this.currentFrame;

  if (from < 0) {
    self.error("Starting list number must be greater than 0");
    return;
  }
  if (scriptId) {
    var scriptInfo = client.scripts[scriptId];
    if (from  > scriptInfo.lineCount) {
      self.error(util.format("Script %s has %d lines,\n" +
			     "but you asked to start at line %d.",
			     scriptName, scriptInfo.lineCount,
			     from));
      return;
    }
  }
  self.pause();
  client.reqSource(from, to, frame, function(err, res) {
    if (err || !res) {
      self.error("You can't list source code right now");
      self.resume();
      return;
    }
    var source = (self.repl.useColors && ! bare) ?
	ch.highlight(res.source, 'js') : res.source;
    var lines = source.split('\n');
    var lineno;
    for (var i = 0; i < lines.length; i++) {
      lineno = res.fromLine + i + 1;
      if (lineno < from || lineno > to) continue;

      var current = lineno === (1 + client.currentSourceLine),
	  breakpoint = client.breakpoints.some(function(bp) {
	    return (bp.scriptReq === client.currentScript ||
		    bp.script === client.currentScript) &&
	      bp.line == lineno;
	  });

      if (lineno === 1) {
	// The first line needs to have the module wrapper
	// filtered out of it.
	var wrapper = require('module').wrapper[0];
	lines[i] = lines[i].slice(wrapper.length);

	client.currentSourceColumn -= wrapper.length;
      }

      var line = lines[i];

      if (bare) {
	  self.print(line);
      } else {
	  var prefixChar = '  ';
	  if (current) {
	      prefixChar = '->';
	      if (self.repl.useColors) {
		  prefixChar = terminal.bolden(prefixChar);
	      }
	  } else if (breakpoint) {
	      prefixChar = 'xx';
	  }

	  self.print(utilCompat.leftPad(lineno, prefixChar, to) + ' ' + line);
	  self.lastListLine = lineno;
      }

    }
    self.lastListLine++;
    self.resume(silent);
  });
}

// All frame-changing commands funnel down to this routine.
Interface.prototype.adjustFrame = function(offset, absolute) {
  if (!this.requireConnection()) return;

  var self = this,
      client = this.client;

  self.pause();
  client.fullTrace(function(err, bt) {
    if (err) {
      self.error("Can't request backtrace now");
      self.resume(true);
      return;
    }

    var finalIndex = (absolute) ? offset : self.backtraceIndex + offset;
    if (finalIndex < 0) {
      self.error("Adjusting would put us beyond the newest frame");
      self.resume(true);
      return;
    }
    if (finalIndex >= stackSize(bt)) {
      self.error("Adjusting would put us beyond the oldest frame");
      self.resume(true);
      return;
    }

    self.backtraceIndex = finalIndex;
    var frame = bt.frames[self.backtraceIndex];
    var number = frame.line + 1;
    self.client.currentScript = frame.script.name;
    self.client.currentSourceLine = frame.line;
    self.client.currentSourceColumn = frame.column + 1;
    self.client.currentFrame = finalIndex;
    self.frame = frame;
    var prefix = finalIndex != 0 ? "call" : self.event,
	line = util.format("%s in %s at line %d:%d",
			   prefix, frame.script.name, number,
			   frame.column + 1);
    self.print(line);
    self.list(frame.line, frame.line+1, finalIndex, true);

    self.resume(true);
  });
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

  if (this.args.pid) {
    // `node debug -p pid`
    try {
      process._debugProcess(this.args.pid);
    } catch (e) {
      process.exit(e.errno);
    }
  } else if (this.args.host) {
    // Connecting to remote debugger
    // `node debug localhost:5858`
    host = this.args.host
    this.child = {
      kill: function() {
	// TODO Do we really need to handle it?
      }
    };
  } else {
    if (!this.attach) {
      if (this.args.port) {
	// Start debugger on custom port
	// `node debug --port=5858 app.js`
	childArgs = ['--debug-brk=' + port].concat(childArgs);
      } else {
	childArgs = ['--debug-brk'].concat(childArgs);
      }

      if (host == 'localhost' && !noWait && !this.args.attach) {
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
    }
  }

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
    self.event = 'break'
    self.response = misc.clone(res.body);
    self.handleBreak(res.body);
  });

  client.on('exception', function(res) {
    self.event = 'exception'
    self.response = misc.clone(res.body);
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

  if (this.args.pid) {
    setImmediate(function() {
      self.print('connecting to port ' + port + '..', true);
      attemptConnect();
    });
  } else {
    this.child.stderr.once('data', function() {
      setImmediate(function() {
	self.print('connecting to port ' + port + '..', true);
	attemptConnect();
      });
    });
  }
  return true;
};

/*===================================================
  Printing routines
  =====================================================*/
// Print text to output stream
Interface.prototype.print = function(text, oneline) {
  if (this.killed) return;

  this.stdout.write(utilCompat.isString(text) ?
		    text : util.inspect(text));

  if (oneline !== true) {
	this.stdout.write('\n');
  }
};

// Print markdown text to output stream
Interface.prototype.markupPrint = function(text) {
  if (this.repl.useColors) {
    this.print(terminal.markup(text, this.displayWidth).trim(), true);
  } else {
    this.print(text.trim(), true);
  }
};

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
