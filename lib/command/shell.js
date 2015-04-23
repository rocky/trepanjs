/*===========================================
  Debugger 'shell' command

  Starts a nodejs REPL (read-eval-print loop)
  ===============================================*/
function Init(intf, Interface) {
    intf.defineCommand('shell', {
	help: 'shell\n\
\n\
start a nodejs REPL (read-eval-print loop).',
	connection: true,
	run: function() {
	    intf.print('Press Ctrl + C (SIGINT) to leave debug repl;\n' +
		       'Ctrl + D (EOF) leaves everything!\n' +
		       '.help gives REPL help');

	    // Don't display any default messages
	    var listeners = intf.repl.rli.listeners('SIGINT').slice(0);
	    intf.repl.rli.removeAllListeners('SIGINT');

	    // Exit debug repl on Ctrl + C
	    intf.repl.rli.once('SIGINT', function() {
		// Restore all listeners
		process.nextTick(function() {
		    listeners.forEach(function(listener) {
			intf.repl.rli.on('SIGINT', listener);
		    });
		});

		// Exit debug repl
		intf.exitRepl();
	    });

	    // Set new
	    intf.repl.eval = intf.debugEval.bind(intf);
	    intf.repl.context = {};

	    // Swap history
	    intf.history.control = intf.repl.rli.history;
	    intf.repl.rli.history = intf.history.debug;

	    intf.repl.setPrompt('> ');
	    intf.repl.displayPrompt();
	}
    });

}

exports.Init = Init;
