"use strict";
/*=================================
  Debugger 'down' command
  ===================================*/

function Init(intf, Interface) {

    intf.defineCommand('down', {
	connection: true,
	help: "**down**\n\
\n\
Move the current frame down in the stack trace (to an older frame). 0 is\n\
the most recent frame.\n\
See also:\n\
---------\n\
`up`, `frame`",
	run: function() {
	    intf.adjustFrame(-1, false);
	}
    });
}

exports.Init = Init;
