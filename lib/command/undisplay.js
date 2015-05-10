"use strict";
/*==============================
  Debugger 'undisplay' command
  =============================*/
function Init(intf, Interface) {
    intf.defineCommand('undisplay', {
	help: "**undisplay**('*expr*')\n\
\n\
Cancel some expressions to be displayed when program stops.",
	run: function(expr) {
	    var index = intf._displays.indexOf(expr);
	    // undisplay by expression or watcher number
	    intf._displays.splice(index !== -1 ? index : +expr, 1);
	}
    });
}

exports.Init = Init;
