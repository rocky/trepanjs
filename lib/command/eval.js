/*===============================
  Debugger 'eval' command
  =================================*/
eval = require('../eval');
function Init(intf, Interface) {
    intf.defineCommand('eval', {
	aliases: ['eval?'],
	help: "**eval**(['*expr*'])\n\
\n\
Evaluate *expr* in the context of the current frame of the debugged program.\n\
\n\
If no string is given, we run the string from the current source code about to be run.\n\
If the command ends ? (via an alias) and no string is given, the following translations\n\
occur:\n\
   {if|while} (<expr>) :  => <expr>\n\
   return <expr>       => <expr>\n\
   <var> = <expr>      => <expr>\n\
\n\
See also:\n\
---------\n\
`shell`",
	connection: true,
	run: function(expr) {
	    if (!expr) {
		expr = intf.client.currentSourceLineText;
		var name = intf.cmdName;
		if (name[name.length -1] == '?') {
		    expr = eval.extract_expression(expr);
		}
		intf.print(util.format("evaluating: %s", expr));
	    };
	    intf.debugEval(expr, null, null, function(err, value) {
		intf.print(err ? '<error>' : value);
	    });
	}
    });
}

exports.Init = Init;
