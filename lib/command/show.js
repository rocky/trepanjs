"use strict";
/*=================================
  Debugger 'show' command
  ===================================*/
var utilCompat  = require('../utilcompat'),
    columnize = require('../columnize'),
    cmds = require('../cmds'),
    util = require('util');

var helpTxt = '**show**  \n\
**show(**"*what*"**)**\n\
\n\
show debugger environment for *what*.\n\
\n\
If *what* is not given, show information for lots of debugger state.\n\
*what* is either: "args", "highlight", "listsize", "version", or "width".\n\
\n\
Examples:\n\
------------\n\
    show\n\
    show("listsize")\n\
\n\
See also:\n\
---------\n\
`set`';

function Init(intf, Interface) {
    var subcmds = cmds.defineSubcommands('show');
    intf.defineCommand('show', {
	help: function(what) {
	    if (!what) {
		intf.markupPrint(helpTxt);
	    } else {
		var subcmd = subcmds[what];
		if (what in subcmds) {
		    intf.markupPrint(subcmd.help);
		} else {
		    intf.error(util.format('No "show" subcommand "%s"',
					   what));
		}
	    }
	},
	run: function(what, value, arg1) {
	    var subcmd = subcmds[what];
	    if (subcmd) {
		subcmd.run(intf, value, arg1);
	    } else if (!what){
		var cmdList = Object.keys(subcmds).sort();
		var opts = {displayWidth: intf.displayWidth,
			    ljust: true};
		intf.section('List of "show" subcommands');
		intf.print(columnize.columnize(cmdList, opts));
	    } else {
		intf.error(util.format('Undefined "show" subcommand "%s"',
				       what));
	    }
	}
    });
}

exports.Init = Init;
