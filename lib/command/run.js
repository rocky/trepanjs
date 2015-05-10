"use strict";
/*==========================
  Debugger 'run' command
  ============================*/
function Init(intf, Interface) {
    intf.defineCommand('run', {
	help: '**run**\n\
\n\
run a debugged program which has died.\n\
The parameters given to the program by are the paramters last used.\n\
However they can be changed via `set("args", [...])`.\n\
\n\
To start a running program, use `restart`.\n\
See also:\n\
------------\n\
`restart`, `set("args", ...)`',
	run: function() {
	    var callback = arguments[0];
	    if (intf.child) {
		intf.error('App is already running... Try `restart` instead');
		callback && callback(true);
	    } else {
		intf.trySpawn(callback);
	    }
	}
    });
}

exports.Init = Init;
