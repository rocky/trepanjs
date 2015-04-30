// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger 'set highlight' command.
  ====================================================*/
var utilCompat  = require('../../utilcompat');

function Init(name, subcmd) {
    return {
	help: "**set('highlight',**', *boolean*)\n\
\n\
Set whether we use terminal highlighting.\n\
Examples:\n\
---------\n\
    set('highlight', false)   // turn off terminal highlight\n\
See also:\n\
---------\n\
`show('highlight')`",
	run: function(intf, value) {
	    if (utilCompat.isBoolean(value)) {
		intf.repl.useColors = value;
		intf.commands['show'].run('highlight');
	    } else {
		intf.error('highlight needs a boolean parameter, got: ' + value);
	    }
	}
    }
}

exports.Init = Init;
