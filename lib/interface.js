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
// This class is the repl-enabled debugger interface which is invoked on
// "node debug"

var assert = require('assert'),
    path = require('path'),
    clientSide = require('./client'),
    // cmds = require('./cmds'),
    util = require('util'),
    utilCompat  = require('./utilcompat'),
    inherits = util.inherits,
    repl = require('./repl'),
    terminal = require('./terminal'),
    vm = require('vm'),
    spawn = require('child_process').spawn;

function Interface(stdin, stdout, args) {
    var self = this;

    this.stdin = stdin;
    this.stdout = stdout;

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

    var proto = Interface.prototype,
	ignored = ['pause', 'resume', 'exitRepl', 'handleBreak',
		   'defineCommand',
                   'requireConnection', 'killChild', 'trySpawn',
                   'controlEval', 'debugEval', 'print', 'childPrint',
                   'clearline', 'move'],
	aliases = {
	    'list' : ['l'],
            'backtrace': ['bt', 'where'],
            'clearBreakpoint': ['cb'],
            'cont': ['c'],
            'next': ['n'],
            'pause_': ['pause'],
            'restart': ['R'],
            'run': ['r'],
            'quit': ['q', 'exit'],
            'setBreakpoint': ['sb'],
            'step': ['s']
	};

    this.proto = proto;

    // Copy all prototype methods in repl context
    // Setup them as getters if possible
    for (var i in proto) {
	if (Object.prototype.hasOwnProperty.call(proto, i) &&
            ignored.indexOf(i) === -1) {
	    this.defineCommand(i, i);
	    if (aliases[i]) {
		for (var j = 0; j < aliases[i].length; j++) {
		    this.defineCommand(i, aliases[i][j]);
		}
	    }
	}
    }

    this.aliases = aliases;
    this.killed = false;
    this.waiting = null;
    this.paused = 0;
    this.context = this.repl.context;
    this.history = {
	debug: [],
	control: []
    };
    this.breakpoints = [];
    this._watchers = [];
    this.backtraceIndex = 0;

    // Run script automatically
    this.pause();

    // XXX Need to figure out why we need this delay
    setTimeout(function() {

	self.run(function() {
	    self.resume();
	});
    }, 10);
}

exports.Interface = Interface;

// Add a debugger command or alias to the
// list of commands the REPL understands.
Interface.prototype.defineCommand = function(cmdName, alias) {
    // Check arity
    var fn = this.proto[cmdName].bind(this);

    if (this.proto[cmdName].length === 0) {
	Object.defineProperty(this.repl.context, alias, {
	    get: fn,
	    enumerable: true,
	    configurable: false
	});
    } else {
	this.repl.context[alias] = fn;
    }
};

/*=================================
  Debugger 'alias' command
===================================*/
Interface.prototype.alias = function(alias, name) {
    var x = foo();
    if (this.aliases[name]) {
	this.aliases[name] = this.aliases[name].concat(alias);
	this.defineCommand(name, alias);
    } else {
	this.error(util.format("Debugger command '%s' not found; " +
                               "alias %s not set",
			       name, alias));
    }
};

/*============================================================
  Debugger commands handling stream control
====================================================*/


/*=================================
  Debugger 'pause' command
===================================*/
Interface.prototype.pause = function() {
    if (this.killed || this.paused++ > 0) return this;
    this.repl.rli.pause();
    this.stdin.pause();
    return this;
};

/*===========================
Debugger 'resume' command
==============================*/
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

// Format and print text from child process
Interface.prototype.childPrint = function(text) {
    this.print(text.toString().split(/\r\n|\r|\n/g).filter(function(chunk) {
	return chunk;
    }).map(function(chunk) {
	return chunk;
    }).join('\n'));
    this.repl.displayPrompt(true);
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

    // Print break data
    this.print(SourceInfo(r));

    // Show watchers' values
    this.watchers(true, function(err) {
	if (err) return self.error(err);

	// And list source
	self.list(1);

	self.resume(true);
    });
};


// Internal method for checking connection state
Interface.prototype.requireConnection = function() {
  if (!this.client) {
    this.error("App isn't running... Try `run` instead");
    return false;
  }
  return true;
};


/*=================================
    Eval functions and commands
==================================*/

// Used for debugger's commands evaluation and execution
Interface.prototype.controlEval = function(code, context, filename,
					   callback) {
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

	// console.log(code, context, filename); // XXX debug
	var result = vm.runInContext(code, context, filename);
	// console.log(utilCompat.isFunction(result)); // XXX debug
	if (utilCompat.isFunction(result)) {
	    result();
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
	callback(e);
    }
};

// Used for debugger's remote evaluation (`repl`) commands
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

/*===============================
  Debugger 'help' command
=================================*/
Interface.prototype.help = function() {
    this.print(helpMessage);
};


// Run script
Interface.prototype.run = function() {
    var callback = arguments[0];

    if (this.child) {
	this.error('App is already running... Try `restart` instead');
	callback && callback(true);
    } else {
	this.trySpawn(callback);
    }
};


/*==========================
 Debugger 'restart' command
============================*/
Interface.prototype.restart = function() {
  if (!this.requireConnection()) return;

  var self = this;

  self.pause();
  self.killChild();

  // XXX need to wait a little bit for the restart to work?
  setTimeout(function() {
    self.trySpawn();
    self.resume();
  }, 1000);
};


/*==========================
 Debugger 'version' command
============================*/
Interface.prototype.version = function() {
  if (!this.requireConnection()) return;

  var self = this;

  this.pause();
  this.client.reqVersion(function(err, v) {
    if (err) {
      self.error(err);
    } else {
      self.print(v);
    }
    self.resume();
  });
};

/*==========================
 Debugger 'list' command
============================*/
Interface.prototype.list = function(delta) {
    if (!this.requireConnection()) return;


    delta || (delta = 5);
    if (!utilCompat.isNumber(delta)) {
	try {
	    this.error(util.format("Need a count of lines to list; got %s",
				   delta));
	} catch (e) {
	    // %s can't convert all types always, like object this
	    // fallback to not show argument passed.
	    this.error("Need a count of lines to list");
	}
	return;
    }

    var self = this,
	client = this.client,
	from = client.currentSourceLine - delta + 1,
	to = client.currentSourceLine + delta + 1;

    self.pause();
    client.reqSource(from, to, function(err, res) {
	if (err || !res) {
	    self.error("You can't list source code right now");
	    self.resume();
	    return;
	}
	if (delta == -1) {
	    self.resume();
	    return;
	}
	var lines = res.source.split('\n');
	for (var i = 0; i < lines.length; i++) {
	    var lineno = res.fromLine + i + 1;
      if (lineno < from || lineno > to) continue;

	    var current = lineno == 1 + client.currentSourceLine,
		breakpoint = client.breakpoints.some(function(bp) {
		    return (bp.scriptReq === client.currentScript ||
			    bp.script === client.currentScript) &&
			bp.line == lineno;
		});

	    if (lineno == 1) {
		// The first line needs to have the module wrapper
		// filtered out of it.
		var wrapper = require('module').wrapper[0];
		lines[i] = lines[i].slice(wrapper.length);

		client.currentSourceColumn -= wrapper.length;
	    }

	    // Highlight executing statement
	    var line;
	    if (current) {
		line = SourceUnderline(lines[i],
				       client.currentSourceColumn,
				       self.repl);
	    } else {
		line = lines[i];
	    }

	    var prefixChar = ' ';
	    if (current) {
		prefixChar = '>';
	    } else if (breakpoint) {
		prefixChar = '*';
	    }

	    self.print(leftPad(lineno, prefixChar, to) + ' ' + line);
	}
	self.resume();
    });
};

/*=============================
 Debugger 'backtrace' command
===============================*/
Interface.prototype.backtrace = function() {
    if (!this.requireConnection()) return;

    var self = this,
	client = this.client;

    self.pause();
    client.fullTrace(function(err, bt) {
	if (err) {
	    self.error("Can't request backtrace now");
	    self.resume();
	    return;
	}

	if (bt.totalFrames == 0) {
	    self.print('(empty stack)');
	} else {
	    var trace = [],
		firstFrameNative = bt.frames[0].script.isNative;

	    for (var i = 0; i < bt.frames.length; i++) {
		var frame = bt.frames[i];
		if (!firstFrameNative && frame.script.isNative) break;

		var prefix = '##';
		// (self.backtraceIndex == i) ? '->' : '##'
		var text = prefix + ' ';
		if (frame.func.name && frame.func.name.length > 0) {
		    text += frame.func.name + ' called from file ';
		} else if (frame.func.inferredName &&
			   frame.func.inferredName.length > 0) {
		    text += frame.func.inferredName + ' called from file ';
		} else {
		    text += 'in file ';
		}
		text += frame.script.name + ' at line ';
		text += (frame.line + 1) + ':' + (frame.column + 1);

		trace.push(text);
	    }

	    self.print(trace.join('\n'));
	}

	self.resume();
    });
};


/*==============================================================
    infoFiles debugger command

Gives list of files loaded.  An asterisk indicates if the file is the
current one we are stopped at.

arguments[0] tells if it should display internal node scripts or not.
This is available only for internal debugger's functions.
=============================================================*/
Interface.prototype.infoFiles = function() {
  if (!this.requireConnection()) return;

  var client = this.client,
      displayNatives = arguments[0] || false,
      scripts = [];

  this.pause();
  for (var id in client.scripts) {
    var script = client.scripts[id];
    if (utilCompat.isObject(script) && script.name) {
      if (displayNatives ||
          script.name == client.currentScript ||
          !script.isNative) {
        scripts.push(
            (script.name == client.currentScript ? '* ' : '  ') +
            id + ': ' +
            path.basename(script.name)
        );
      }
    }
  }
  this.print(scripts.join('\n'));
  this.resume();
};


/*========================================
 Debugger 'continue' command.

Continues execution of the program
==========================================*/
Interface.prototype.cont = function() {
  if (!this.requireConnection()) return;
  this.pause();

  var self = this;
  this.client.reqContinue(function(err) {
    if (err) self.error(err);
    self.resume();
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


/*=================================
  Debugger 'next' (step over) command
===================================*/
Interface.prototype.next = Interface.stepGenerator('next', 1);


/*=================================
  Debugger 'step' (step in) command
===================================*/
Interface.prototype.step = Interface.stepGenerator('in', 1);


/*=================================
  Debugger 'finish' (step out) command
===================================*/
Interface.prototype.finish = Interface.stepGenerator('out', 1);


// Watch
Interface.prototype.watch = function(expr) {
  this._watchers.push(expr);
};

// Unwatch
Interface.prototype.unwatch = function(expr) {
  var index = this._watchers.indexOf(expr);

  // Unwatch by expression
  // or
  // Unwatch by watcher number
  this._watchers.splice(index !== -1 ? index : +expr, 1);
};

// List watchers
Interface.prototype.watchers = function() {
  var self = this,
      verbose = arguments[0] || false,
      callback = arguments[1] || function() {},
      waiting = this._watchers.length,
      values = [];

  this.pause();

  if (!waiting) {
    this.resume();

    return callback();
  }

  this._watchers.forEach(function(watcher, i) {
    self.debugEval(watcher, null, null, function(err, value) {
      values[i] = err ? '<error>' : value;
      wait();
    });
  });

  function wait() {
    if (--waiting === 0) {
      if (verbose) self.print('Watchers:');

      self._watchers.forEach(function(watcher, i) {
        self.print(leftPad(i, ' ', self._watchers.length - 1) +
                   ': ' + watcher + ' = ' +
                   JSON.stringify(values[i]));
      });

      if (verbose) self.print('');

      self.resume();

      callback(null);
    }
  }
};

// Break on exception
Interface.prototype.breakOnException = function breakOnException() {
  if (!this.requireConnection()) return;

  var self = this;

  // Break on exceptions
  this.pause();
  this.client.reqSetExceptionBreak('all', function(err, res) {
    self.resume();
  });
};

/*============================================================
  Debugger setBreakpoint command.

Sets a breakpoint.
==============================================================*/
Interface.prototype.setBreakpoint = function(script, line,
                                             condition, silent) {
  if (!this.requireConnection()) return;

  var self = this,
      scriptId,
      ambiguous;

  // setBreakpoint() should insert breakpoint on current line
  if (util.isUndefined(script)) {
    script = this.client.currentScript;
    line = this.client.currentSourceLine + 1;
  }

  // setBreakpoint(line-number) should insert breakpoint in current script
  if (util.isUndefined(line) && util.isNumber(script)) {
    line = script;
    script = this.client.currentScript;
  }

  if (/\(\)$/.test(script)) {
    // setBreakpoint('functionname()');
    var req = {
      type: 'function',
      target: script.replace(/\(\)$/, ''),
      condition: condition
    };
  } else {
    // setBreakpoint('scriptname')
    if (script != +script && !this.client.scripts[script]) {
      var scripts = this.client.scripts;
      Object.keys(scripts).forEach(function(id) {
        if (scripts[id] &&
            scripts[id].name &&
            scripts[id].name.indexOf(script) !== -1) {
          if (scriptId) {
            ambiguous = true;
          }
          scriptId = id;
        }
      });
    } else {
      scriptId = script;
    }

    if (ambiguous) return this.error('Script name is ambiguous');
    if (line <= 0) return this.error('Line should be a positive value');

    var req;
    if (scriptId) {
      req = {
        type: 'scriptId',
        target: scriptId,
        line: line - 1,
        condition: condition
      };
    } else {
      this.print('Warning: script \'' + script + '\' was not loaded yet.');
      var escapedPath = script.replace(/([/\\.?*()^${}]|[\]])/g, '\\$1');
      var scriptPathRegex = '^(.*[\\/\\\\])?' + escapedPath + '$';
      req = {
        type: 'scriptRegExp',
        target: scriptPathRegex,
        line: line - 1,
        condition: condition
      };
    }
  }

  self.pause();
  self.client.setBreakpoint(req, function(err, res) {
    if (err) {
      if (!silent) {
        self.error(err);
      }
    } else {
      if (!silent) {
        self.list(-1);
      }

      // Try load scriptId and line from response
      if (!scriptId) {
        scriptId = res.script_id;
        line = res.line + 1;
      }

      // Remember this breakpoint even if scriptId is not resolved yet
      self.client.breakpoints.push({
        id: res.breakpoint,
        scriptId: scriptId,
        script: (self.client.scripts[scriptId] || {}).name,
        line: line,
        condition: condition,
        scriptReq: script
      });
      var info = "Breakpoint " + res.breakpoint +
	    " set in file " + (self.client.scripts[scriptId] || {}).name +
	    ", line " + line + ".";
      self.print(info);
    }
    self.resume();
  });
};

/*============================================================
  Debugger clearBreakpoint command.

  Removes a previously set breakpoint.
==============================================================*/
Interface.prototype.clearBreakpoint = function(script, line) {
  if (!this.requireConnection()) return;

  var ambiguous,
      breakpoint,
      index;

  this.client.breakpoints.some(function(bp, i) {
    if (bp.scriptId === script ||
        bp.scriptReq === script ||
        (bp.script && bp.script.indexOf(script) !== -1)) {
      if (!util.isUndefined(index)) {
        ambiguous = true;
      }
      if (bp.line === line) {
        index = i;
        breakpoint = bp.id;
        return true;
      }
    }
  });

  if (ambiguous) return this.error('Script name is ambiguous');

  if (util.isUndefined(breakpoint)) {
    return this.error('Script : ' + script + ' not found');
  }

  var self = this,
      req = {
        breakpoint: breakpoint
      };

  self.pause();
  self.client.clearBreakpoint(req, function(err, res) {
    if (err) {
      self.error(err);
    } else {
      self.client.breakpoints.splice(index, 1);
      self.list(5);
    }
    self.resume();
  });
};


/*============================================================
  Debugger 'breakpoints' command.

Lists current breakpoints.
====================================================*/
Interface.prototype.breakpoints = function() {
  if (!this.requireConnection()) return;

  this.pause();
  var self = this;
  this.client.listbreakpoints(function(err, res) {
    if (err) {
      self.error(err);
    } else {
      var breakpoints = res.breakpoints;
      if (breakpoints.length > 0) {
        self.print("# Type       Enb What");
      }
      breakpoints.forEach(function(bp) {
        var id = bp.number + " ";
        var script = (self.client.scripts[bp.script_id] || {}).name;
        var number = parseInt(bp.line, 10) + 1;
        var line = id;
        var type = (bp.type == "scriptId" ? "breakpoint " : "unknown ");
        var active = (bp.active ? "y   " : "n   ");
        var line = id + type + active + script + ":" + number;
        self.print(line);
      });
      self.resume();
    }
  });
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


/*===========================================
Debugger 'kill' command

Terminates the debugged process.
This is the child of the debugger process.
===============================================*/
Interface.prototype.kill = function() {
  if (!this.child) return;
  this.killChild();
};


/*===========================================
Debugger 'shell' command

Starts a nodejs REPL (read-eval-print loop)
===============================================*/
Interface.prototype.shell = function() {
    if (!this.requireConnection()) return;

    var self = this;

    self.print('Press Ctrl + C (SIGINT) to leave debug repl; ' +
	      '.help gives REPL help');

    // Don't display any default messages
    var listeners = this.repl.rli.listeners('SIGINT').slice(0);
    this.repl.rli.removeAllListeners('SIGINT');

    // Exit debug repl on Ctrl + C
    this.repl.rli.once('SIGINT', function() {
	// Restore all listeners
	process.nextTick(function() {
	    listeners.forEach(function(listener) {
		self.repl.rli.on('SIGINT', listener);
	    });
	});

	// Exit debug repl
	self.exitRepl();
    });

    // Set new
    this.repl.eval = this.debugEval.bind(this);
    this.repl.context = {};

    // Swap history
    this.history.control = this.repl.rli.history;
    this.repl.rli.history = this.history.debug;

    this.repl.rli.setPrompt('> ');
    this.repl.displayPrompt();
};


// Exit debug repl
Interface.prototype.exitRepl = function() {
    // Restore eval
    this.repl.eval = this.controlEval.bind(this);

    // Swap history
    this.history.debug = this.repl.rli.history;
    this.repl.rli.history = this.history.control;

    this.repl.context = this.context;
    this.repl.rli.setPrompt(this.prompt);
    this.repl.displayPrompt();
};


/*=================================
  Debugger 'quit' command
===================================*/
Interface.prototype.quit = function(exitcode) {
    this.print("That's all folks...");
    exitcode || (exitcode = 0);

    this.killChild();
    if (!utilCompat.isNumber(exitcode)) {
	try {
	    this.error(util.format("Expecting an integer exit code; got %s",
				   exitcode));
	} catch (e) {
	    // %s can't convert all types always, like object this
	    // fallback to not show argument passed.
	    this.error("expecting an integer exit code");
	}
    }
    process.exit(exitcode);
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
	    var line = "(break in " + script + ":" + number + ")";
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

/*=================================
  Debugger 'show' command
===================================*/
Interface.prototype.show = function(name) {
    name = name || '';
    switch (name) {
    case 'args':
	this.print('args: ' + JSON.stringify(this.args.argv.remain));
	return;
    case 'highlight':
	this.print('highlight: ' +  Boolean(this.repl.useColors));
	return;
    case '':
	var showProps = ['args', 'highlight'];
	for (var i in showProps) {
	    this.show(showProps[i]);
	}
	return;
    default:
	this.print('unkown field: ' + name);
	return;
    }
};

// Eval
Interface.prototype.eval = function(expression) {
    if (!this.requireConnection()) return;
    var self = this;
    this.debugEval(expression, null, null, function(err, value) {
	self.print(err ? '<error>' : value);
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
Interface.prototype.trySpawn = function(cb) {
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
};

var commands = [
    [
	'run (r)',
	'cont (c)',
	'next (n)',
	'step (s)',
	'list (l)',
	'backtrace (bt, where)',
	'setBreakpoint (sb)',
	'clearBreakpoint (cb)'
    ],
    [
	'alias',
	'breakOnException',
	'breakpoints',
	//'down',
	'eval',
	//'frame',
	'finish',
	'infoFiles',
	'kill',
	'list',
	'restart',
	'shell',
	'show',
	'unwatch',
	//'up',
	'version',
	'watch',
	'watchers'
    ]
];


var helpMessage = 'Commands: ' + commands.map(function(group) {
  return group.join(', ');
}).join(',\n');


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
  var result = '(' + (body.exception ? 'exception in ' : 'break in ');

  if (body.script) {
    if (body.script.name) {
      var name = body.script.name,
          dir = path.resolve() + '/';

      // Change path to relative, if possible
      if (name.indexOf(dir) === 0) {
        name = name.slice(dir.length);
      }

      result += name;
    } else {
      result += '[unnamed]';
    }
    result += ':';
    result += body.sourceLine + 1;
    result += ')';
  }

  if (body.exception) result += '\n' + body.exception.text;

  return result;
}

// Utils

// Adds spaces and prefix to number
// maxN is a maximum number we should have space for
function leftPad(n, prefix, maxN) {
  var s = n.toString(),
      nchars = Math.max(2, String(maxN).length) + 1,
      nspaces = nchars - s.length - 1;

  for (var i = 0; i < nspaces; i++) {
    prefix += ' ';
  }

  return prefix + s;
}
