// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger 'show version' command.
  ====================================================*/
util = require('util');

function Init(name, subcmd) {
    return {
	help: "**show('version')**\n\
\n\
Show the trepanjs and V8 release numbers.\n\
Examples:\n\
---------\n\
    show('version')",
	run: function(intf, value) {
	    intf.pause();
	    intf.client.reqVersion(function(err, v) {
		if (err) {
		    intf.error(err);
		} else {
		    intf.print(util.format("trepanjs version %s",
					   intf.args.version));
		    intf.print(util.format("V8 version %s", v));
		}
		intf.resume();
	    });
	}
    }
}

exports.Init = Init;
