/*==========================
  Debugger 'list' command
  ============================*/
var utilCompat  = require('../utilcompat'),
    ch = require('consolehighlighter');

function Init(intf, Interface) {
    intf.defineCommand('list', {
	help: "**list**([*from*, [*to*]])\n\
**list**('-')\n\
\n\
List source-code lines from *from* to *to*.\n\
\n\
With no arguments, lists *listSize* line starting after previous listing.\n\
With `-` lists the *listsize* lines before a previous *listsize*-line listing.\n\
If *to* is less than *from*, it is take to be a line count.\n\
\n\
Examples\n\
-------\n\
    list        // Picks up listing from last line listed\n\
    list()      // Same as above\n\
    list(4)     // lists listSize lines starting from 4\n\
    list(4, 10) // list lines 4 to 10\n\
    list(10, 4) // lists 4 lines starting from 10\n\
    list('-')   // list lines just before 10\n\
    list('.')   // lists starting at current source line\n\
",
	connection: true,
	run: function(from, to) {
	    // intf.print([from, to]);
	    if (!from) {
		from = intf.lastListLine;
		if (!to) {
		    to = from + intf.listSize - 1;
		}
	    } else {
		if (utilCompat.isString(from)) {
		    if (from === '-') {
			from = intf.lastListLine - (2 * intf.listSize + 1);
			to = from + intf.listSize;
		    } else if (from === '.') {
			from = intf.client.currentSourceLine;
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
		var source = (intf.repl.useColors) ?
		    ch.highlight(res.source, 'js') : res.source;
		var lines = source.split('\n');
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
}

exports.Init = Init;
