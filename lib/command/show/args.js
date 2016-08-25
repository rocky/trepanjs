// Copyright 2015-2016 Rocky Bernstein
/*============================================================
  Debugger 'show args' command.
  ====================================================*/
var utilCompat  = require('../../utilcompat');

function Init(name, subcmd) {
    return {
	help: "**show('args')**'\n\
\n\
Show argument list to give program being debugged when it is started or\n\
restarted.\n\
See also:\n\
---------\n\
`set('args')`",
	run: function(intf, value) {
    	    intf.print('args: ' + intf.args.argv.remain);
	}
    }
}

exports.Init = Init;
