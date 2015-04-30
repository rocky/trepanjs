// Copyright 2015 Rocky Bernstein
var columnize = require('../columnize'),
    utilCompat = require('../utilcompat');
/*===============================
  Debugger 'help' command
  =================================*/
var util  = require('util');

function Init(intf, Interface) {
    intf.defineCommand('help', {
	help: "Type **help**('*command-name*') to get help for command *command-name*.\n\
Type **help('*')** for the list of all commands.\n\
\n\
Note above the use of parenthesis after 'help' and the quotes when specifying\n\
a parameter.",
	aliases: ['h', '?'],
	run: function(what, suboption) {
	    if (!what) {
		intf.markupPrint(intf.commands['help'].help);
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
		cmd = intf.commands[what];
		var helpObj = cmd.help;
		if (utilCompat.isFunction(helpObj)) {
		    helpObj(suboption);
		} else {
		    intf.markupPrint(helpObj);
		}
		if (cmd.aliases.length > 0) {
		    intf.section("Aliases:");
		};
		intf.print(cmd.aliases.join(', '));
	    } else {
		intf.error(util.format("'%s' is not a debugger command", what));
	    }
	}
    });
}

exports.Init = Init;
