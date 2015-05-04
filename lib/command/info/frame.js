// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger info('frame')' command
  =============================================================*/
var util  = require('util'),
    columnize = require('../../columnize');

function Init(name, subcmd) {
    return {
	help: "**info('frame')**\n\
\n\
Information about the selected stack frame.\n\
See also:\n\
---------\n\
`info('args')`, `info('locals')`",
	connection: true,
	run: function(intf, name) {
	    intf.pause();
	    intf.client.reqFrame(function(err, frame) {
		if (err) {
		    intf.error(err);
		} else {
		    console.log(frame);
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
		intf.resume();
	    });
	}
    }
}

exports.Init = Init;
