/*=================================
  Debugger 'show' command
  ===================================*/
var util=require('util');

function Init(intf, Interface) {
    intf.defineCommand('show', {
	help: '**show**\n\
show("*what*")\n\
\n\
show debugger environment for *what*.\n\
\n\
If *what* is not given, show information for lots of debugger state.\n\
*what* is either: "args", "highlight", "listsize", "version", or "width".\n\
\n\
Examples:\n\
------------\n\
    show\n\
    show("listsize")\n\
\n\
See also:\n\
---------\n\
`set`',
	run: function(name) {
	    name = name || '';
	    switch (name) {
	    case 'args':
		intf.print('args: ' + JSON.stringify(intf.args.argv.remain));
		return;
	    case 'highlight':
		intf.print('highlight: ' +  Boolean(intf.repl.useColors));
		return;
	    case 'listsize':
		intf.print('listsize: ' +  intf.listSize);
		return;
	    case 'version':
		intf.pause();
		intf.client.reqVersion(function(err, v) {
		    if (err) {
			intf.error(err);
		    } else {
			intf.print(util.format("trepanjs version %s",
					       intf.args.version));
			intf.print(util.format("V8 version %s", v));
		    }
		    intf.resume();
		});
		return;
	    case 'width':
		intf.print('width: ' + intf.opts.displayWidth);
		return;
	    case '':
		var showProps = ['args', 'highlight', 'listSize', 'version', 'width'];
		for (var i in showProps) {
		    intf.commands['show'].run(showProps[i]);
		}
		return;
	    default:
		intf.error('unknown field: ' + name);
		return;
	    }
	}
    });
}

exports.Init = Init;
