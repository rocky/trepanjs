// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger info('locals')' command
  =============================================================*/
var util  = require('util');

function Init(name, subcmd) {
    return {
	help: "**info('locals'** *[,frame-num]* **)**\n\
\n\
Show the local variables of a stack frame. In *frame-num* is not given, \n\
information about the current frame is shown.\n\
See also:\n\
---------\n\
`info('args')`, `info('frame')`",
	connection: true,
	// FIXME: DRY with info('args')
	run: function(intf, frame) {
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
		intf.resume(true);
	    }, frame);
	}
    }
}

exports.Init = Init;
