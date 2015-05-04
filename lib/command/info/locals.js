// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger info('locals')' command
  =============================================================*/
var util  = require('util');

function Init(name, subcmd) {
    return {
	help: "**info('locals')**\n\
\n\
Show the local variables of current stack frame.",
	connection: true,
	// FIXME: DRY with info('args')
	run: function(intf, name) {
	    intf.pause();
	    intf.client.reqFrame(function(err, frame) {
		if (err) {
		    intf.error(err);
		} else {
		    if (frame.locals.length === 0) {
			intf.print("No local variables");
		    } else {
			frame.locals.forEach(function(obj) {
			    intf.debugEval("typeof " +  obj.name, null, null,
					   function(err, value) {
					       var v = err ? '<error>' : value;
					       intf.print(util.format("%s: %s",
								      obj.name, v))
					   });
			});
		    }
		}
		intf.resume();
	    });
	}
    }
}

exports.Init = Init;
