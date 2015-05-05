// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger set('maxstack', ...) command.
  ====================================================*/
var utilCompat  = require('../../utilcompat');

function Init(name, subcmd) {
    return {
	help: "**set('maxstack',**', *number*)\n\
\n\
Set the maximum number entries in a backtrace.\n\
Examples:\n\
---------\n\
    set('maxstack', 20)   // show at most 20 calls in a backtrace\n\
See also:\n\
---------\n\
`show('maxstack')`, `backtrace`",
	run: function(intf, value) {
	    if (utilCompat.isNumber(value)) {
		intf.maxStack = value;
		intf.commands['show'].run('maxstack');
	    } else {
		intf.error('maxstrack needs an integer parameter, got: ' + value);
	    }
	}
    }
}

exports.Init = Init;
