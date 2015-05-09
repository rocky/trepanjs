// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger info('args')' command
  =============================================================*/
var util  = require('util');

function Init(name, subcmd) {
    return {
	help: "**info('args'** *[,frame-num]* **)**\n\
\n\
Argument variables of a stack frame. If *frame-num* is not given,\n\
information about the current frame is shown.\n\
See also:\n\
---------\n\
`info('locals')`, `info('frame')`",
	connection: true,
	// FIXME: DRY with info('locals')
	run: function(intf, frame) {
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
		intf.resume(true);
	    }, frame);
	}
    }
}

exports.Init = Init;
