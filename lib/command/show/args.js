// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger 'set args' command.
  ====================================================*/
var utilCompat  = require('../../utilcompat');

function Init(name, subcmd) {
    return {
	help: "**show('args')**'\n\
\n\
Show argument list to give program being debugged when it is started or\n\
restarted.",
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
