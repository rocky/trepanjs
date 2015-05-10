"use strict";
/*=================================
  Debugger 'quit' command
  ===================================*/
var utilCompat  = require('../utilcompat');
function Init(intf, Interface) {
    intf.defineCommand('quit', {
	help: '**quit**([*exit code*])\n\
\n\
exit the debugger. If *exit code* is supplied, that becomes the exit code\n\
of the program.\n\
Examples:\n\
---------\n\
    quit    // exit giving return code 0\n\
    quit(5) // exit giving return code 5\n\
See also:\n\
---------\n\
`run`, `restart`',
	aliases: ['q', 'exit'],
	run: function(exitcode) {
	    intf.print("That's all folks...");
	    exitcode || (exitcode = 0);

	    intf.killChild();
	    if (!utilCompat.isNumber(exitcode)) {
		try {
		    intf.error(util.format("Expecting an integer exit code; got %s",
					   exitcode));
		} catch (e) {
		    // %s can't convert all types always, like object this
		    // fallback to not show argument passed.
		    intf.error("expecting an integer exit code");
		}
	    }
	    process.exit(exitcode);
	}
    });

}

exports.Init = Init;
