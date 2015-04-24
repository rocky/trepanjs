/*=================================
  Debugger 'display' command
  ===================================*/
function Init(intf, Interface) {

    intf.defineCommand('display', {
	help: "**display**(['*exp*'])\n\
\n\
Print value of expression *exp* each time the program stops.\n\
With no argument, evaluate and display all currently-requested\n\
expressions",
	run: function(expr) {
	    if (expr) {
		intf._displays.push(expr);
	    } else if (intf._displays.length == 0) {
		intf.error("There are no displays currently set.");
		return;
	    }
 	    intf.displays();
	}
    });
}

exports.Init = Init;
