// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger info('program')' command

  Gives list of files loaded.  An asterisk indicates if the file is the
  current one we are stopped at.

  arguments[0] tells if it should display internal node scripts or not.
  This is available only for internal debugger's functions.
  =============================================================*/
var util  = require('util');

function Init(name, subcmd) {
    return {
	help: "**info('program')**\n\
\n\
Execution status of the program.",
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
