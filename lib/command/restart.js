/*==========================
  Debugger 'restart' command
  ============================*/
function Init(intf, Interface) {
    intf.defineCommand('restart', {
	help: 'restart\n\
\n\
restart debugged program.',
	aliases: ['R'],
	run: function() {
	    if (!intf.requireConnection()) return;
	    intf.pause();
	    intf.killChild();

	    // XXX need to wait a little bit for the restart to work?
	    setTimeout(function() {
		intf.trySpawn();
		intf.resume();
	    }, 1000);
	}
    });
}

exports.Init = Init;
