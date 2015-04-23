/*=================================
  Debugger 'alias' command
  ===================================*/
util = require('util');

function Init(intf, Interface) {

    intf.defineCommand('alias', {
	help: "alias('alias', 'command')\n\
\n\
Add alias *alias* for a debugger command *command*. ",
	run: function(alias, cmdName) {
	    if (cmdName in intf.commands) {
		intf.aliases[alias] = intf.commands[cmdName];
	    } else {
		intf.error(util.format("Debugger command '%s' not found; " +
				       "alias %s not set",
				       cmdName, alias));
	    }
	}
    });
}

exports.Init = Init;
