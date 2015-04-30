// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger 'show width' command.
  ====================================================*/

function Init(name, subcmd) {
    return {
	help: "**show('width')**\n\
\n\
Show the number of characters the debugger thinks are in a line.\n\
Examples:\n\
---------\n\
    show('width')\n\
See also:\n\
---------\n\
`set('width', ...)`",
	run: function(intf, value) {
	    intf.print('width: ' + intf.displayWidth);
	}
    }
}

exports.Init = Init;
