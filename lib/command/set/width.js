// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger 'set width' command.
  ====================================================*/
var utilCompat  = require('../../utilcompat');

function Init(name, subcmd) {
    return {
	help: "**set('width',**', *number*)\n\
\n\
Set the number of characters the debugger thinks are in a line.\n\
Examples:\n\
---------\n\
    set('width', 100)   // set terminal width 100\n\
See also:\n\
---------\n\
`show('width')`",
	run: function(intf, value) {
	    if (utilCompat.isNumber(value)) {
		intf.displayWidth = value;
		intf.commands['show'].run('width');
	    } else {
		intf.error('width needs an integer parameter, got: ' + value);
	    }
	}
    }
}

exports.Init = Init;
