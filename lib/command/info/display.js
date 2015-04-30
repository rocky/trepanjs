// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger 'info display' command
  =============================================================*/
function Init(intf, Interface) {
    return {
	help: "**info('display')**\n\
\n\
Show expressions to display when program stops.\n\
See also:\n\
---------\n\
`display`, `undisplay`",
	run: function(intf) {
	    if (intf._displays.length == 0) {
		intf.error("There are no auto-display expressions now.")
	    } else {
		intf.displays();
	    }
	}
    }
}

exports.Init = Init;
