// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger info('program')' command
  =============================================================*/
var util  = require('util');

function Init(name, subcmd) {
    return {
	help: "**info('program')**\n\
\n\
Execution status of the program.\n\
---------\n\
`info('line')`, `info('frame')`",
	connection: true,
	run: function(intf) {

	    intf.print(util.format(
		"Program is stopped at event %s", intf.event));
	    if (intf.client.brkpts && intf.client.brkpts.length > 0) {
		var bkpt = intf.client.brkpts.length === 1 ?
		    'breakpoint' : 'breakpoints';
		intf.print(util.format(
		    "It is stopped at %s %s.",
		    bkpt, intf.client.brkpts.join(', ')));
	    }
	}
    }
}

exports.Init = Init;
