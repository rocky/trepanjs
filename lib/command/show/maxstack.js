// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger show('maxstack')' command.
  ====================================================*/

function Init(name, subcmd) {
    return {
	help: "**show('maxstack')**\n\
\n\
See the maxiumum number of entries in a backtrace maximum listed.\n\
Examples:\n\
---------\n\
    show('maxstack')\n\
See also:\n\
---------\n\
`set('maxstack', ...)`, `backtrace`",
	run: function(intf, value) {
	    intf.print('maxstack: ' + intf.maxStack);
	}
    }
}

exports.Init = Init;
