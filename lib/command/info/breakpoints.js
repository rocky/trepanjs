// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger info('breakpoints') command.
  Lists current breakpoints.
  ====================================================*/
var util = require('util');
function Init(name, subcmd) {
    return {
	help: "**info('breakpoints')**\n\
list breakpoints",
	connection: true,
	run: function(intf) {
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
			var count = intf.breakpointHits[bp.number];
			if (count != undefined) {
			    var suffix = (count > 1) ? 's' : '';
			    intf.print(util.format("\tbreakpoint already hit %d time%s",
						   count, suffix));
			}
		    });
		    intf.resume();
		}
	    });
	}
    };
}

exports.Init = Init;
