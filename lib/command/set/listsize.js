// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger 'set listsize' command.
  ====================================================*/
var utilCompat  = require('../../utilcompat');

function Init(name, subcmd) {
    return {
	help: "**set('listsize',**', *number*)\n\
\n\
Set the number lines printed in a `list` command by default\n\
Examples:\n\
---------\n\
    set('listsize', 20) // list source-code 20 lines by default\n\
See also:\n\
---------\n\
`show('listsize')`",
	run: function(intf, value) {
	    if (utilCompat.isNumber(value)) {
		intf.listSize = value;
		intf.commands['show'].run('listsize');
	    } else {
		intf.error('listsize needs an integer parameter, got: ' +
			   value);
	    }
	}
    }
}

exports.Init = Init;
