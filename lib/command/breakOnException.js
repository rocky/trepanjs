"use strict";
/*========================================
  Debugger 'breakOnException' command
  ========================================*/
var clientSide = require('../client');

function Init(intf, Interface) {

    intf.defineCommand('breakOnException', {
	help: '**breakOnException**\n\
\n\
Enter the debugger on an exception.',
	connection: true,
	run: function breakOnException() {
	    // Break on exceptions
	    intf.pause();
	    intf.client.reqSetExceptionBreak('all', function(err, res) {
		intf.resume();
	    });

	    // Pause child process
	    Interface.prototype.pause_ = function() {
	    if (!intf.requireConnection()) return;

	    var cmd = 'process._debugPause();';

	    intf.pause();
	    intf.client.reqFrameEval(cmd, clientSide.NO_FRAME, function(err, res) {
		if (err) {
		    intf.error(err);
		} else {
		    intf.resume();
		}
	    });
	    }
	}
    });
}

exports.Init = Init;
