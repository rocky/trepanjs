/*============================================================
  Debugger 'set' command.
  ==============================================================*/
utilCompat  = require('../utilcompat');
function Init(intf, Interface) {
    intf.defineCommand('set', {
	help: 'set("*param*", *value*)\n\
\n\
set *param* to *value*\n\
*param* must be either the string "args", "listSize", "width", or "highlight".;\n\
*value* must be of the appropriate type for the parameter, e.g. a number,\n\
boolean, or array.',
	run: function(param, value) {
	    switch (param) {
	    case 'args':
		if (utilCompat.isArray(value)) {
		    intf.args.argv.remain = value;
		} else {
		    intf.error('listSize needs an Array parameter, got: ' + value);
		}
		break;
	    case 'listSize':
		if (utilCompat.isNumber(value)) {
		    intf.listSize = value;
		} else {
		    intf.error('listSize needs an integer parameter, got: ' + value);
		}
		break;
	    case 'width':
		if (utilCompat.isNumber(value)) {
		    intf.displayWidth = value;
		} else {
		    intf.error('width needs an integer parameter, got: ' + value);
		}
		break;
	    case 'highlight':
		if (utilCompat.isBoolean(value)) {
		    intf.repl.useColors = value;
		} else {
		    intf.error('highlight needs a boolean parameter, got: ' + value);
		}
		break;
	    default:
		intf.error('unknown set parameter: ' + name);
		return;
	    }
	}
    });
}

exports.Init = Init;
