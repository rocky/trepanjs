/*==============================================================
  Debugger 'infoFiles' command

  Gives list of files loaded.  An asterisk indicates if the file is the
  current one we are stopped at.

  arguments[0] tells if it should display internal node scripts or not.
  This is available only for internal debugger's functions.
  =============================================================*/
var utilCompat  = require('../utilcompat'),
    path = require('path');

function Init(intf, Interface) {
    intf.defineCommand('infoFiles', {
	help: "**infoFiles**\n\
\n\
List files loaded.  An asterisk indicates if the file is the\n\
current one we are stopped at.",
	connection: true,
	run: function() {
	    var client = intf.client,
		displayNatives = arguments[0] || false,
		scripts = [];

	    intf.pause();
	    for (var id in client.scripts) {
		var script = client.scripts[id];
		if (utilCompat.isObject(script) && script.name) {
		    if (displayNatives ||
			script.name == client.currentScript ||
			!script.isNative) {
			scripts.push(
			    (script.name == client.currentScript ? '* ' : '  ') +
				id + ': ' +
				path.basename(script.name)
			);
		    }
		}
	    }
	    intf.print(scripts.join('\n'));
	    intf.resume();
	}
    });

}

exports.Init = Init;
