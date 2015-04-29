/*==============================================================
  Debugger 'infoLine' command

  Gives list of files loaded.  An asterisk indicates if the file is the
  current one we are stopped at.

  arguments[0] tells if it should display internal node scripts or not.
  This is available only for internal debugger's functions.
  =============================================================*/
var util  = require('util');

function Init(intf, Interface) {
    intf.defineCommand('infoLine', {
	help: "**infoLine**\n\
\n\
Show information about the current line.",
	connection: true,
	run: function() {
	    var client = intf.client;
	    var r = intf.response;
	    intf.print(util.format(
		"Line %d column %s of file \"%s\", event %s",
		r.sourceLine+1, r.sourceColumn+1,
		r.script ? r.script.name : "unknown",
		intf.event));
	}
    });

}

exports.Init = Init;
