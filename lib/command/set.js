"use strict";
/*============================================================
  Debugger 'set' command.
  ==============================================================*/
var utilCompat  = require('../utilcompat'),
    columnize = require('../columnize'),
    cmds = require('../cmds'),
    util = require('util');

var helpTxt = '**set**("*param*", *value*)\n\
**set**\n\
\n\
set *param* to *value*\n\
*param* must be either a string and *value* must be of the appropriate\n\
type for the parameter, e.g. a number, boolean, or array.\n\
\n\
\nIn the second form, we give a list of parameters that can be supplied.\n\
\n\
Examples:\n\
---------\n\
    set                 // lists set parameters\n\
    set("listSize", 20) // list source-code 20 lines by default\n\
    set("width", 100)   // set terminal width 100\n\
See also:\n\
---------\n\
`show`';


function Init(intf, Interface) {
    var subcmds = cmds.defineSubcommands('set');
    intf.defineCommand('set', {
	help: function(what) {
	    if (!what) {
		intf.markupPrint(helpTxt);
	    } else {
		var subcmd = subcmds[what];
		if (what in subcmds) {
		    intf.markupPrint(subcmd.help);
		} else {
		    intf.error(util.format('No "set" subcommand "%s"',
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
		intf.section('List of "set" subcommands');
		intf.print(columnize.columnize(cmdList, opts));
	    } else {
		intf.error(util.format('Undefined "set" subcommand "%s"',
				       what));
	    }
	}
    });
}

exports.Init = Init;
