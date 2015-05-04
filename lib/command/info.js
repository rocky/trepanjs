// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger 'info' command.
  ==============================================================*/
var columnize = require('../columnize'),
    cmds = require('../cmds'),
    util = require('util');

var helpTxt = "**info**(['*subcommand*', ...])\n\
\n\
Generic command for showing things about the program being debugged.\n\
\n\
To get a list of \"info\" subcommands, type: `info`\n\
To get help on a \"info\" subcommand, type:\n\
`help('info',` '*sub-command*'`)`."

function Init(intf, Interface) {
    var subcmds = cmds.defineSubcommands('info');
    intf.defineCommand('info', {
	help: function(what) {
	    if (!what) {
		intf.markupPrint(helpTxt);
	    } else {
		var subcmd = subcmds[what];
		if (what in subcmds) {
		    intf.markupPrint(subcmd.help);
		} else {
		    intf.error(util.format('No "info" subcommand "%s"',
					   what));
		}
	    }
	},
	run: function(what, arg1, arg2) {
	    var subcmd = subcmds[what];
	    if (subcmd) {
		subcmd.run(intf, arg1, arg2);
	    } else if (!what){
		var cmdList = Object.keys(subcmds).sort();
		var opts = {displayWidth: intf.displayWidth,
			    ljust: true};
		intf.section('List of "info" subcommands');
		intf.print(columnize.columnize(cmdList, opts), true);
	    } else {
		intf.error(util.format('Undefined "info" subcommand "%s"',
				       what));
	    }
	}
    })
}

exports.Init = Init;
