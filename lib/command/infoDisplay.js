/*==============================================================
  Debugger 'infoDisplay' command
  =============================================================*/
function Init(intf, Interface) {
    intf.defineCommand('infoDisplay', {
	help: 'infoDisplay: Expressions to display when program stops',
	run: function() {
	    if (intf._displays.length == 0) {
		intf.error("There are no auto-display expressions now.")
	    } else {
		intf.displays();
	    }
	}
    });
}

exports.Init = Init;
