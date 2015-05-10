"use strict";
/*==========================
  Debugger 'list' command
  ============================*/
var utilCompat  = require('../utilcompat');

function Init(intf, Interface) {
    intf.defineCommand('list', {
	help: "**list**([*from*, [*to*]])\n\
**list**('-')\n\
**list**('.')\n\
\n\
List source-code lines from *from* to *to*.\n\
\n\
With no arguments, lists *listSize* line starting after previous listing.\n\
With `-` lists the *listsize* lines before a previous *listsize*-line listing,\n\
and with '.' the current line is reset to be the stopped source-code line.\n\
\n\
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
			intf.resume(true);
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
	    intf.list(from, to, intf.client.currentFrame, true);

	}
    });
}

exports.Init = Init;
