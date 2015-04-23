/*==============================
  Debugger 'undisplay' command
  =============================*/
function Init(intf, interface) {
    intf.defineCommand('undisplay', {
	help: "undisplay('expr'): Cancel some expressions to be displayed when program stops.",
	run: function(expr) {
	    var index = intf._displays.indexOf(expr);
	    // undisplay by expression or watcher number
	    intf._displays.splice(index !== -1 ? index : +expr, 1);
	}
    });
}

exports.Init = Init;
