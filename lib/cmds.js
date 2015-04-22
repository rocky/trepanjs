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

// trepanjs debugger commands.

var utilCompat  = require('./utilcompat'),
    columnize = require('./columnize'),
    path = require('path'),
    util = require('util');

// Note commands are alphbetic order.
function defineCommands(intf, Interface) {

    /*=================================
      Debugger 'alias' command
      ===================================*/
    intf.defineCommand('alias', {
	help: "alias('alias', 'command'): Add alias *alias* for a debugger command *command*. ",
	action: function(alias, cmdName) {
	    if (cmdName in intf.commands) {
		intf.aliases[alias] = intf.commands[cmdName];
	    } else {
		intf.error(util.format("Debugger command '%s' not found; " +
				       "alias %s not set",
				       cmdName, alias));
	    }
	}
    });


    /*=============================
      Debugger 'backtrace' command
      ===============================*/
    intf.defineCommand('backtrace', {
	help: 'List current call stack',
	connection: true,
	action: function() {
	    if (!intf.requireConnection()) return;

	    var client = intf.client;

	    intf.pause();
	    client.fullTrace(function(err, bt) {
		if (err) {
		    intf.error("Can't request backtrace now");
		    intf.resume();
		    return;
		}

		if (bt.totalFrames == 0) {
		    intf.print('(empty stack)');
		} else {
		    var trace = [],
			firstFrameNative = bt.frames[0].script.isNative;

		    for (var i = 0; i < bt.frames.length; i++) {
			var frame = bt.frames[i];
			if (!firstFrameNative && frame.script.isNative) break;

			var prefix = '##';
			// (intf.backtraceIndex == i) ? '->' : '##'
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

		    intf.print(trace.join('\n'));
		}

		intf.resume();
	    });
	}
    });


    /*========================================
      Debugger 'breakOnException' command
      ========================================*/
    intf.defineCommand('breakOnException', {
	help: 'enter debugger on an exception',
	connection: true,
	action: function breakOnException() {
	    // Break on exceptions
	    intf.pause();
	    intf.client.reqSetExceptionBreak('all', function(err, res) {
		intf.resume();
	    });

	    // Pause child process
	    Interface.prototype.pause_ = function() {
	    if (!intf.requireConnection()) return;

	    var cmd = 'process._debugPause();';

	    intf.pause();
	    intf.client.reqFrameEval(cmd, clientSide.NO_FRAME, function(err, res) {
		if (err) {
		    intf.error(err);
		} else {
		    intf.resume();
		}
	    });
	    }
	}
    });


    /*============================================================
      Debugger clearBreakpoint command.

      Removes a previously set breakpoint.
      ==============================================================*/
    intf.defineCommand('clearBreakpoint', {
	help: 'clearBreapoint(script, line): Remove a previously-set breakpoint',
	aliases: ['cb'],
	connection: true,
	action: function(script, line) {
	    var ambiguous,
		breakpoint,
		index;

	    intf.client.breakpoints.some(function(bp, i) {
		if (bp.scriptId === script ||
		    bp.scriptReq === script ||
		    (bp.script && bp.script.indexOf(script) !== -1)) {
		    if (!utilCompat.isUndefined(index)) {
			ambiguous = true;
		    }
		    if (bp.line === line) {
			index = i;
			breakpoint = bp.id;
			return true;
		    }
		}
	    });

	    if (ambiguous) return intf.error('Script name is ambiguous');

	    if (utilCompat.isUndefined(breakpoint)) {
		return intf.error('Script : ' + script + ' not found');
	    }

	    var req = {
		breakpoint: breakpoint
	    };
	    intf.pause();
	    intf.client.clearBreakpoint(req, function(err, res) {
		if (err) {
		    intf.error(err);
		} else {
		    intf.client.breakpoints.splice(index, 1);
		    intf.commands['list'].action(intf.client.currentSourceLine - 1,
						 intf.client.currentSourceLine + 1);
		}
		intf.resume();
	    });
	}
    });

    /*========================================
      Debugger 'cont' command.

      Continues execution of the program.
      Note that the name has to be 'cont', not 'continue'
      since 'continue' is a Javascript reserved word.
      However we add an alias 'continue', which works around
      this.
      ==========================================*/
    intf.defineCommand('cont', {
	help: 'cont: continues execution of the program',
	aliases: ['c', 'continue'],
	connection: true,
	action: function() {
	    intf.pause();

	    intf.client.reqContinue(function(err) {
		if (err) intf.error(err);
		intf.resume();
	    });
	}
    });


    /*=================================
      Debugger 'display' command
      ===================================*/
    intf.defineCommand('display', {
	help: "watch('expression'): Print value of expression EXP each time the program stops.",
	action: function(expr) {
	    intf._displays.push(expr);
 	    intf.displays();
	}
    });

    /*===============================
      Debugger 'eval' command
      =================================*/
    intf.defineCommand('eval', {
	help: "eval('string'): evaluate string in the context of the debugged program",
	connection: true,
	action: function(expression) {
	    intf.debugEval(expression, null, null, function(err, value) {
		intf.print(err ? '<error>' : value);
	    });
	}
    });

    /*=================================
      Debugger 'finish' (step out) command
      ===================================*/
    intf.defineCommand('next', {
	help: "finish: step to the end of the current subroutine. Sometimes called 'step over'",
	aliases: ['fin'],
	action: intf.finish
    });

    /*===============================
      Debugger 'help' command
      =================================*/
    intf.defineCommand('help', {
	help: "Type help('command-name') to get help for command *command-name*.\n\
Type help('*') for the list of all commands.\n\
\n\
Note above the use of parenthesis after 'help' and the quotes when specifying\n\
a parameter.",
	aliases: ['h'],
	action: function(what) {
	    if (!what) {
		intf.print(intf.commands['help'].help);
		return;
	    } else if (what == '*') {
		intf.section('List of debugger commands');
		var cmdList = Object.keys(intf.commands).sort();
		var opts = {displayWidth: intf.displayWidth,
			    ljust: true};
		intf.print(columnize.columnize(cmdList, opts));
		return;
	    } else if (what in intf.aliases) {
		what = intf.aliases[what].name
	    }
	    if (what in intf.commands) {
		intf.section(what);
		intf.print(intf.commands[what].help);
		intf.print(' \n');
	    } else {
		intf.error(util.format("'%s' is not a debugger command", what));
	    }
	}
    });

    /*============================================================
      Debugger 'infoBreakpoints' command.
      Lists current breakpoints.
      ====================================================*/
    intf.defineCommand('infoBreakpoints', {
	help: 'list breakpoints',
	connection: true,
	action: function() {
	    intf.pause();
	    intf.client.listbreakpoints(function(err, res) {
		if (err) {
		    intf.error(err);
		} else {
		    var breakpoints = res.breakpoints;
		    if (breakpoints.length > 0) {
			intf.section("# Type       Enb What");
		    }
		    breakpoints.forEach(function(bp) {
			var id = bp.number + " ";
			var script = (intf.client.scripts[bp.script_id] || {}).name;
			var number = parseInt(bp.line, 10) + 1;
			var line = id;
			var type = (bp.type == "scriptId" ? "breakpoint " : "unknown ");
			var active = (bp.active ? "y   " : "n   ");
			var line = id + type + active + script + ":" + number;
			intf.print(line);
		    });
		    intf.resume();
		}
	    });
	}
    });

    /*==============================================================
      Debugger 'infoDisplay' command
      =============================================================*/
    intf.defineCommand('infoDisplay', {
	help: 'infoDisplay: Expressions to display when program stops',
	action: function() {
	    intf.displays();
	}
    });

    /*==============================================================
      Debugger 'infoFiles' command

      Gives list of files loaded.  An asterisk indicates if the file is the
      current one we are stopped at.

      arguments[0] tells if it should display internal node scripts or not.
      This is available only for internal debugger's functions.
      =============================================================*/
    intf.defineCommand('infoFiles', {
	help: "Gives list of files loaded.  An asterisk indicates if the file is the\n\
current one we are stopped at.",
	connection: true,
	action: function() {
	    var client = intf.client,
		displayNatives = arguments[0] || false,
		scripts = [];

	    intf.pause();
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
	    intf.print(scripts.join('\n'));
	    intf.resume();
	}
    });


    /*==========================
      Debugger 'list' command
      ============================*/
    intf.defineCommand('list', {
	help: "list([from, [to]]):\n\
List specified line.\n\
With no arguments, lists *listsize* more lines after or around previous listing.\n\
'list -' lists the *listsize* lines before a previous *listsize*-line listing.",
	connection: true,
	action: function(from, to) {
	    // intf.print([from, to]);
	    if (!from) {
		from = intf.lastListLine;
		if (!to) {
		    to = from + intf.listSize;
		}
	    } else {
		if (utilCompat.isString(from)) {
		    if (from === '-') {
			from = intf.lastListLine - (2 * intf.listSize + 2);
			to = from + intf.listSize;
		    } else {
			intf.error(util.format("Expecting first parameter to be '*' or a number; got %s",
					       from));
			intf.resume();
			return;
		    }
		} else if (utilCompat.isNumber(from)) {
		    if (!to) {
			to = from + intf.listSize;
		    } else if (to < from) {
			to = from + to - 1;
		    }
		} else {
		    intf.error(util.format("Expecting first parameter to be '*' or a number; got %s",
					   from));
		}
	    }

	    var client = intf.client;
	    // intf.print([from, to]);

	    intf.pause();
	    client.reqSource(from, to, function(err, res) {
		if (err || !res) {
		    intf.error("You can't list source code right now");
		    intf.resume();
		    return;
		}
		var lines = res.source.split('\n');
		var lineno;
		for (var i = 0; i < lines.length; i++) {
		    lineno = res.fromLine + i + 1;
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

		    var line = lines[i];

		    var prefixChar = ' ';
		    if (current) {
			prefixChar = '>';
		    } else if (breakpoint) {
			prefixChar = '*';
		    }

		    intf.print(utilCompat.leftPad(lineno, prefixChar, to) + ' ' + line);
		    intf.lastListLine = lineno;

		}
		intf.lastListLine++;
		intf.resume();
	    });
	}
    });

    /*=================================
      Debugger 'next' (step over) command
      ===================================*/
    intf.defineCommand('next', {
	connection: true,
	help: "next: step program, but unlike 'step', but skips over subroutine calls. Sometimes called 'step over'",
	aliases: ['n'],
	action: intf.next
    });

    /*=================================
      Debugger 'pause' command
      ===================================*/
    // intf.defineCommand('pause', {
    // 	help: 'Pause running code (like pause button in Developer Tools)',
    // 	connection: true,
    // 	action: intf.pause
    // });

    /*=================================
      Debugger 'quit' command
      ===================================*/
    intf.defineCommand('quit', {
	help: 'exit debugger',
	aliases: ['q', 'exit'],
	action: function(exitcode) {
	    intf.print("That's all folks...");
	    exitcode || (exitcode = 0);

	    intf.killChild();
	    if (!utilCompat.isNumber(exitcode)) {
		try {
		    intf.error(util.format("Expecting an integer exit code; got %s",
					   exitcode));
		} catch (e) {
		    // %s can't convert all types always, like object this
		    // fallback to not show argument passed.
		    intf.error("expecting an integer exit code");
		}
	    }
	    process.exit(exitcode);
	}
    });


    /*==========================
      Debugger 'restart' command
      ============================*/
    intf.defineCommand('restart', {
	help: 'restart program',
	aliases: ['R'],
	action: function() {
	    if (!intf.requireConnection()) return;
	    intf.pause();
	    intf.killChild();

	    // XXX need to wait a little bit for the restart to work?
	    setTimeout(function() {
		intf.trySpawn();
		intf.resume();
	    }, 1000);
	}
    });

    /*==========================
      Debugger 'run' command
      ============================*/
    intf.defineCommand('run', {
	help: 'run debugged program',
	action: function() {
	    var callback = arguments[0];
	    if (intf.child) {
		intf.error('App is already running... Try `restart` instead');
		callback && callback(true);
	    } else {
		intf.trySpawn(callback);
	    }
	}
    });

    /*============================================================
      Debugger 'set' command.
      ==============================================================*/
    intf.defineCommand('set', {
	help: 'set("param", value):\n\
set param to value\n\
param must be either the string "args", "listSize", "width", or "highlight";\n\
value must be of the appropriate type for the parameter, e.g. a number,\n\
boolean, or array.',
	action: function(param, value) {
	    switch (param) {
	    case 'args':
		if (utilCompat.isArray(value)) {
		    intf.args.argv.remain = value;
		} else {
		    intf.error('listSize needs an Array parameter, got: ' + value);
		}
		break;
	    case 'listSize':
		if (utilCompat.isNumber(value)) {
		    intf.listSize = value;
		} else {
		    intf.error('listSize needs an integer parameter, got: ' + value);
		}
		break;
	    case 'width':
		if (utilCompat.isNumber(value)) {
		    intf.displayWidth = value;
		} else {
		    intf.error('width needs an integer parameter, got: ' + value);
		}
		break;
	    case 'highlight':
		if (utilCompat.isBoolean(value)) {
		    intf.repl.useColors = value;
		} else {
		    intf.error('highlight needs a boolean parameter, got: ' + value);
		}
		break;
	    default:
		intf.error('unknown set parameter: ' + name);
		return;
	    }
	}
    });

    /*============================================================
      Debugger setBreakpoint command.

      Sets a breakpoint.
      ==============================================================*/
    intf.defineCommand('setBreakpoint', {
	aliases: ['sb'],
	help: 'set a breakpoint',
	connection: true,
	action: function(script, line,
                         condition, silent) {
	    var scriptId,
		ambiguous;

	    // setBreakpoint() should insert breakpoint on current line
	    if (utilCompat.isUndefined(script)) {
		script = intf.client.currentScript;
		line = intf.client.currentSourceLine + 1;
	    }

	    // setBreakpoint(line-number) should insert breakpoint in current script
	    if (utilCompat.isUndefined(line) && utilCompat.isNumber(script)) {
		line = script;
		script = intf.client.currentScript;
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
		if (script != +script && !intf.client.scripts[script]) {
		    var scripts = intf.client.scripts;
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

		if (ambiguous) return intf.error('Script name is ambiguous');
		if (line <= 0) return intf.error('Line should be a positive value');

		var req;
		if (scriptId) {
		    req = {
			type: 'scriptId',
			target: scriptId,
			line: line - 1,
			condition: condition
		    };
		} else {
		    intf.print('Warning: script \'' + script + '\' was not loaded yet.');
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

	    intf.pause();
	    intf.client.setBreakpoint(req, function(err, res) {
		if (err) {
		    if (!silent) {
			intf.error(err);
		    }
		} else {
		    if (!silent) {
			intf.commands['list'].action(intf.client.currentSourceLine - 1,
						     intf.client.currentSourceLine + 1);
		    }

		    // Try load scriptId and line from response
		    if (!scriptId) {
			scriptId = res.script_id;
			line = res.line + 1;
		    }

		    // Remember this breakpoint even if scriptId is not resolved yet
		    intf.client.breakpoints.push({
			id: res.breakpoint,
			scriptId: scriptId,
			script: (intf.client.scripts[scriptId] || {}).name,
			line: line,
			condition: condition,
			scriptReq: script
		    });
		    var info = "Breakpoint " + res.breakpoint +
			" set in file " + (intf.client.scripts[scriptId] || {}).name +
			", line " + line + ".";
		    intf.print(info);
		}
		intf.resume();
	    });
	}
    });


    /*===========================================
      Debugger 'shell' command

      Starts a nodejs REPL (read-eval-print loop)
      ===============================================*/
    intf.defineCommand('shell', {
	help: 'shell: start nodejs REPL (read-eval-print loop)',
	connection: true,
	action: function() {
	    intf.print('Press Ctrl + C (SIGINT) to leave debug repl; ' +
		       '.help gives REPL help');

	    // Don't display any default messages
	    var listeners = intf.repl.rli.listeners('SIGINT').slice(0);
	    intf.repl.rli.removeAllListeners('SIGINT');

	    // Exit debug repl on Ctrl + C
	    intf.repl.rli.once('SIGINT', function() {
		// Restore all listeners
		process.nextTick(function() {
		    listeners.forEach(function(listener) {
			intf.repl.rli.on('SIGINT', listener);
		    });
		});

		// Exit debug repl
		intf.exitRepl();
	    });

	    // Set new
	    intf.repl.eval = intf.debugEval.bind(intf);
	    intf.repl.context = {};

	    // Swap history
	    intf.history.control = intf.repl.rli.history;
	    intf.repl.rli.history = intf.history.debug;

	    intf.repl.setPrompt('> ');
	    intf.repl.displayPrompt();
	}
    });


    /*=================================
      Debugger 'show' command
      ===================================*/
    intf.defineCommand('show', {
	help: 'show\n\
show("*what*")\n\
\n\
show debugger environment for *what*.\n\
\n\
If *what* is not given, show information for lots of debugger state.\n\
*what* is either: "args", "highlight", "listSize", "version", or "width".',
	action: function(name) {
	    name = name || '';
	    switch (name) {
	    case 'args':
		intf.print('args: ' + JSON.stringify(intf.args.argv.remain));
		return;
	    case 'highlight':
		intf.print('highlight: ' +  Boolean(intf.repl.useColors));
		return;
	    case 'listSize':
		intf.print('listSize: ' +  intf.listSize);
		return;
	    case 'version':
		intf.pause();
		intf.client.reqVersion(function(err, v) {
		    if (err) {
			intf.error(err);
		    } else {
			intf.print(util.format("trepanjs version %s",
					       intf.args.version));
			intf.print(util.format("V8 version %s", v));
		    }
		    intf.resume();
		});
		return;
	    case 'width':
		intf.print('width: ' + intf.opts.displayWidth);
		return;
	    case '':
		var showProps = ['args', 'highlight', 'listSize', 'version', 'width'];
		for (var i in showProps) {
		    intf.commands['show'].action(showProps[i]);
		}
		return;
	    default:
		intf.error('unknown field: ' + name);
		return;
	    }
	}
    });

    /*=================================
      Debugger 'step' (step in) command
      ===================================*/
    intf.defineCommand('step', {
	help: "step: step program. Sometimes called 'step into'",
	aliases: ['s'],
	action: intf.step
    });

    /*==========================
      Debugger 'undisplay' command
      ============================*/
    intf.defineCommand('undisplay', {
	help: "undisplay('expr'): Cancel some expressions to be displayed when program stops.",
	action: function(expr) {
	    var index = intf._displays.indexOf(expr);
	    // undisplay by expression or watcher number
	    intf._displays.splice(index !== -1 ? index : +expr, 1);
	}
    });
}

exports.defineCommands = defineCommands;
