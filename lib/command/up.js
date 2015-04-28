/*=================================
  Debugger 'up' command
  ===================================*/
util = require('util');

function Init(intf, Interface) {

    intf.defineCommand('up', {
	connection: true,
	help: "**up**\n\
\n\
Move the current frame up in the stack trace (to an older frame). 0 is\n\
the most recent frame.\n\
See also:\n\
---------\n\
`down`, `frame`",
	run: function() {
	    intf.move(1, false);
	}
    });
}

exports.Init = Init;
