/*=================================
  Debugger 'quit' command
  ===================================*/
var utilCompat  = require('../utilcompat');
function Init(intf, Interface) {
    intf.defineCommand('quit', {
	help: 'exit debugger',
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
