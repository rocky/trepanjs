// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger 'info line' command

  Gives list of files loaded.  An asterisk indicates if the file is the
  current one we are stopped at.

  arguments[0] tells if it should display internal node scripts or not.
  This is available only for internal debugger's functions.
  =============================================================*/
var util  = require('util');

function Init(name, subcmd) {
    return {
	help: "**info('line')**\n\
\n\
Show information about the current line.",
	connection: true,
	run: function(intf) {
	    var client = intf.client;
	    var r = intf.response;
	    intf.print(util.format(
		"Line %d column %s of file \"%s\", event %s",
		r.sourceLine+1, r.sourceColumn+1,
		r.script ? r.script.name : "unknown",
		intf.event));
	}
    }
}

exports.Init = Init;
