/*==========================
  Debugger 'run' command
  ============================*/
function Init(intf, Interface) {
    intf.defineCommand('run', {
	help: 'run\n\
\n\
Run debugged program.',
	run: function() {
	    var callback = arguments[0];
	    if (intf.child) {
		intf.error('App is already running... Try `restart` instead');
		callback && callback(true);
	    } else {
		intf.trySpawn(callback);
	    }
	}
    });
}

exports.Init = Init;
