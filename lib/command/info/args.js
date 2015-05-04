// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger info('args')' command
  =============================================================*/
var util  = require('util');

function Init(name, subcmd) {
    return {
	help: "**info('args')**\n\
\n\
Argument variables of the current stack frame.",
	connection: true,
	// FIXME: DRY with info('locals')
	run: function(intf, name) {
	    intf.pause();
	    intf.client.reqFrame(function(err, frame) {
		if (err) {
		    intf.error(err);
		} else {
		    if (frame.arguments.length === 0) {
			intf.print("No arguments");
		    } else {
			frame.arguments.forEach(function(obj) {
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
