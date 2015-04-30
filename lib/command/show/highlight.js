// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger 'show highlight' command.
  ====================================================*/

function Init(name, subcmd) {
    return {
	help: "**show('highlight')**\n\
\n\
Set whether we use terminal highlighting.\n\
Examples:\n\
---------\n\
    show('highlight')\n\
See also:\n\
---------\n\
`set('highlight')`",
	run: function(intf) {
	    intf.print('highlight: ' +  Boolean(intf.repl.useColors));
	}
    }
}

exports.Init = Init;
