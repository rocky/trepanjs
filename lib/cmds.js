var utilCompat  = require('./utilcompat'),
    path = require('path'),
    util = require('util');

// Note commands are alphbetic order.
function defineCommands(intf, Interface) {
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


    /*============================================================
      Debugger 'breakpoints' command.
      Lists current breakpoints.
      ====================================================*/
    intf.defineCommand('breakpoints', {
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
		    intf.commands['list'].action(5);
		}
		intf.resume();
	    });
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

    /*===============================
      Debugger 'help' command
      =================================*/
    // XXX Complete this
    intf.defineCommand('help', {
	help: 'help([command]): show debugger help for command\n\
If command is not given show help for all commands',
	aliases: ['h'],
	action: function(what) {
	    if (!what) {
		for (var name in intf.commands) {
		    intf.commands['help'].action(name);
		}
	    } else if (what in intf.commands) {
		intf.section(what);
		intf.print(intf.commands[what].help);
	    } else if (what == '*') {
		intf.section('List of debugger commands');
		for (var name in intf.commands) {
		    intf.print(name);
		}
	    } else {
		intf.error(util.format("'%s' is not a debugger command", what));
	    }
	}
    });

    /*==============================================================
      infoFiles debugger command

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
	help: "list([count]): list source-code lines.\n\
If count isn't given, list 5 lines before and 4 after",
	connection: true,
	action: function(delta) {
	    delta || (delta = 5);
	    if (!utilCompat.isNumber(delta)) {
		try {
		    intf.error(util.format("Need a count of lines to list; got %s",
					   delta));
		} catch (e) {
		    // %s can't convert all types always, like object intf
		    // fallback to not show argument passed.
		    intf.error("Need a count of lines to list");
		}
		return;
	    }

	    var client = intf.client,
		from = client.currentSourceLine - delta + 1,
		to = client.currentSourceLine + delta + 1;

	    intf.pause();
	    client.reqSource(from, to, function(err, res) {
		if (err || !res) {
		    intf.error("You can't list source code right now");
		    intf.resume();
		    return;
		}
		if (delta == -1) {
		    intf.resume();
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

		    var line = lines[i];

		    var prefixChar = ' ';
		    if (current) {
			prefixChar = '>';
		    } else if (breakpoint) {
			prefixChar = '*';
		    }

		    intf.print(utilCompat.leftPad(lineno, prefixChar, to) + ' ' + line);
		}
		intf.resume();
	    });
	}
    });


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
	aliases: ['r'],
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

    /*=================================
      Debugger 'show' command
      ===================================*/
    intf.defineCommand('show', {
	help: 'show [what]: show debugger environment for what\n\
If *what* is not given show information for lots of debugger state',
	action: function(name) {
	    name = name || '';
	    switch (name) {
	    case 'args':
		intf.print('args: ' + JSON.stringify(intf.args.argv.remain));
		return;
	    case 'highlight':
		intf.print('highlight: ' +  Boolean(intf.repl.useColors));
		return;
	    case '':
		var showProps = ['args', 'highlight'];
		for (var i in showProps) {
		    intf.commands['show'].action(showProps[i]);
		}
		return;
	    default:
		intf.error('unkown field: ' + name);
		return;
	    }
	}
    });

    /*==========================
      Debugger 'version' command
      ============================*/
    intf.defineCommand('version', {
	help: 'show nodejs version',
	connection: true,
	action: function() {
	    intf.pause();
	    intf.client.reqVersion(function(err, v) {
		if (err) {
		    intf.error(err);
		} else {
		    intf.print(v);
		}
		intf.resume();
	    });
	}
    });
}

exports.defineCommands = defineCommands;
