"use strict";
/*=================================
  Debugger 'alias' command
  ===================================*/
var util = require('util');

function Init(intf, Interface) {

    intf.defineCommand('alias', {
	help: "**alias**('*alias*', '*command*')\n\
\n\
Add alias *alias* for a debugger command *command*.\n\
\n\
Examples:\n\
--------\n\
    alias('ls', 'list')  // ls now is the same as list\n\
    alias('s',  'step))  // s is now an alias for step.  \n\
                         // The above example is done by default.",
	run: function(alias, cmdName) {
	    if (cmdName in intf.commands) {
		var cmd = intf.commands[cmdName]
		intf.aliases[alias] = cmd;
		cmd.aliases.push(alias);
	    } else {
		intf.error(util.format("Debugger command '%s' not found; " +
				       "alias %s not set",
				       cmdName, alias));
	    }
	}
    });
}

exports.Init = Init;
