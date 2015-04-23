/*=================================
  Debugger 'display' command
  ===================================*/
function Init(intf, Interface) {

    intf.defineCommand('display', {
	help: "display('*exp*')\n\
\n\
Print value of expression *exp* each time the program stops.",
	run: function(expr) {
	    intf._displays.push(expr);
 	    intf.displays();
	}
    });
}

exports.Init = Init;
