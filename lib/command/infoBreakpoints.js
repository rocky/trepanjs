/*============================================================
  Debugger 'infoBreakpoints' command.
  Lists current breakpoints.
  ====================================================*/
function Init(intf, Interface) {
    intf.defineCommand('infoBreakpoints', {
	help: 'list breakpoints',
	connection: true,
	run: function() {
	    intf.pause();
	    intf.client.listbreakpoints(function(err, res) {
		if (err) {
		    intf.error(err);
		} else {
		    var breakpoints = res.breakpoints;
		    if (breakpoints.length > 0) {
			intf.section("# Type       Enb What");
		    }
		    breakpoints.forEach(function(bp) {
			var id = bp.number + " ";
			var script = (intf.client.scripts[bp.script_id] || {}).name;
			var number = parseInt(bp.line, 10) + 1;
			var line = id;
			var type = (bp.type == "scriptId" ? "breakpoint " : "unknown ");
			var active = (bp.active ? "y   " : "n   ");
			var line = id + type + active + script + ":" + number;
			intf.print(line);
		    });
		    intf.resume();
		}
	    });
	}
    });
}

exports.Init = Init;
