// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger 'set args' command.
  ====================================================*/
var utilCompat  = require('../../utilcompat');

function Init(name, subcmd) {
    return {
	help: "**set('args**', *args-array*)\n\
\n\
Set argument list to give program being debugged when it is started or\n\
restarted. Follow this command with an array.",
	run: function(intf, value) {
    	    if (utilCompat.isArray(value)) {
    		intf.args.argv.remain = value;
    	    } else {
    		intf.error('args needs an Array parameter, got: ' + value);
    	    }
	}
    }
}

exports.Init = Init;
