// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger info('args')' command
  =============================================================*/
var util  = require('util'),
    columnize = require('../../columnize');

function Init(name, subcmd) {
    return {
	help: "**info('args')**\n\
\n\
Argument variables of the current stack frame.",
	connection: true,
	run: function(intf, name) {
	    intf.pause();
	    intf.client.reqFrame(function(err, frame) {
		if (err) {
		    intf.error(err);
		} else {
		    var cmdList = [];
		    var opts = {displayWidth: intf.displayWidth,
				ljust: true};
		    frame.arguments.forEach(function(obj) {
			cmdList.push(obj.name);
		    });
		    if (cmdList.length > 0) {
			intf.section("Frame arguments");
			intf.print(columnize.columnize(cmdList, opts), true);
		    } else {
			intf.print("No local variables for this frame");
		    }
		}
		intf.resume();
	    });
	}
    }
}

exports.Init = Init;
