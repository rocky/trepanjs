"use strict";
/*==========================
  Debugger 'restart' command
  ============================*/
function Init(intf, Interface) {
    intf.defineCommand('restart', {
	help: '**restart**\n\
\n\
restart the currently-running program. The parameters given to the program\n\
are the parameters last used. However they can be changed via\n\
`set("args", [...])`.\n\
\n\
To use this command debugged program must be already running.\n\
To start a dead program, use `run`.\n\
See also:\n\
---------\n\
`run`, `set("args", ...)`',
	aliases: ['R'],
	run: function() {
	    if (!intf.requireConnection()) return;
	    intf.pause();
	    intf.killChild();

	    // XXX need to wait a little bit for the restart to work?
	    setTimeout(function() {
		intf.trySpawn();
		intf.resume();
	    }, 1000);
	}
    });
}

exports.Init = Init;
