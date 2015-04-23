/*===============================
  Debugger 'eval' command
  =================================*/
function Init(intf, Interface) {
    intf.defineCommand('eval', {
	help: "eval('*expr*')\n\
\n\
Evaluate *expr* in the context of the debugged program.",
	connection: true,
	run: function(expression) {
	    intf.debugEval(expression, null, null, function(err, value) {
		intf.print(err ? '<error>' : value);
	    });
	}
    });
}

exports.Init = Init;
