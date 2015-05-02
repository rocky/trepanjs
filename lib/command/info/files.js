// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger info('files') command

  Gives list of files loaded.  An asterisk indicates if the file is the
  current one we are stopped at.

  arguments[0] tells if it should display internal node scripts or not.
  This is available only for internal debugger's functions.
  =============================================================*/
var utilCompat  = require('../../utilcompat'),
    util = require('util'),
    path = require('path');

function Init(name, subcmd) {
    return {
	help: "**info('files')**\n\
\n\
List files loaded with their line counts.\n\
An asterisk indicates if the file is the\n\
current one we are stopped at.",
	connection: true,
	run: function(intf) {
	    var client = intf.client,
		displayNatives = arguments[0] || false,
		scripts = [];

	    intf.pause();
	    for (var id in client.scripts) {
		var script = client.scripts[id];
		// console.log(script); //X
		if (utilCompat.isObject(script) && script.name) {
		    if (displayNatives ||
			script.name == client.currentScript ||
			!script.isNative) {
			scripts.push(
			    (script.name == client.currentScript ?
			     '* ' : '  ') +
				util.format("%d: %s, %d lines",
					    id,
					    path.basename(script.name),
					    script.lineCount));
		    }
		}
	    }
	    intf.print(scripts.join('\n'));
	    intf.resume();
	}
    }
}

exports.Init = Init;
