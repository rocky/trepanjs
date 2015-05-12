// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger info('frame')' command
  =============================================================*/
var util  = require('util'),
    columnize = require('../../columnize');

function Init(name, subcmd) {
    return {
	help: "**info('frame'** *[,frame-num]* **)**\n\
\n\
Show the value about to be returned. This command only works, when\n\
you are stopped before a return.\n\
\n\
See also:\n\
---------\n\
`info(`return`), `info('args')`, `info('locals')`",
	connection: true,
	run: function(intf, frame) {
	    intf.pause();
	    intf.client.reqFrame(function(err, frame) {
		if (err) {
		    intf.error(err);
		} else {
		    // console.log(frame);
		    intf.section(util.format('Frame %d', frame.index));
		    intf.print(util.format("  at return: %s",
					   frame.atReturn));
		    var opts = {displayWidth: intf.displayWidth,
				ljust: true, linePrefix: '  '},
			cmdList = [];
		    if (frame.arguments.length === 0) {
			intf.print("No arguments");
		    } else {
			frame.arguments.forEach(function(obj) {
			    cmdList.push(obj.name);
			});
			intf.section("Arguments");
			intf.print(columnize.columnize(cmdList, opts), true);
		    }
		    if (frame.locals.length === 0) {
			intf.print("No local variables");
		    } else {
			cmdList = [];
			frame.locals.forEach(function(obj) {
			    cmdList.push(obj.name);
			});
			intf.section("Local variables");
			intf.print(columnize.columnize(cmdList, opts), true);
		    }
		}
		intf.resume(true);
	    }, frame);
	}
    }
}

exports.Init = Init;
