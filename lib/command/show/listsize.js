// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger 'show listsize' command.
  ====================================================*/
var utilCompat  = require('../../utilcompat');

function Init(name, subcmd) {
    return {
	help: "**show('listsize',**', *number*)\n\
\n\
Show the number lines printed in a `list` command by default\n\
Examples:\n\
---------\n\
    show('listsize', 20) // list source-code 20 lines by default\n\
See also:\n\
---------\n\
`set('listsize', ...)`",
	run: function(intf, value) {
	    intf.print('listsize: ' +  intf.listSize);
	}
    }
}

exports.Init = Init;
