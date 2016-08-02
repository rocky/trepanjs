"use strict";
/*============================================================
  Debugger clearBreakpoint command.

  Removes a previously-set breakpoint.
  ==============================================================*/
var utilCompat = require('../utilcompat');
function Init(intf, Interface) {

    intf.defineCommand('clearBreakpoint', {
	help: '**clearBreakpoint**(*script-name*, *line-number*)\n\
\n\
Remove a previously-set breakpoint.',
	aliases: ['cb'],
	connection: true,
	run: function(script, line) {
	    var ambiguous,
		breakpoint,
		index;
	    var found_script = false;


	    intf.client.breakpoints.some(function(bp, i) {
		if (bp.scriptId === script ||
		    bp.scriptReq === script ||
		    (bp.script && bp.script.indexOf(script) !== -1)) {
		    if (!utilCompat.isUndefined(index)) {
			ambiguous = true;
		    }
		    found_script = true;
		    if (bp.line === line) {
			index = i;
			breakpoint = bp.id;
			return true;
		    }
		}
	    });

	    if (ambiguous) return intf.error('Script name is ambiguous');

	    if (utilCompat.isUndefined(breakpoint)) {
		if (!found_script) {
		    return intf.error(util.format('Script "%s" not found in list of breakpoints',
						  script));
		} else {
		    return intf.error(util.format("Breakpoint at line %d not set in %s",
						  line, script));
		}
	    }

	    var req = {
		breakpoint: breakpoint
	    };
	    intf.pause();
	    intf.client.clearBreakpoint(req, function(err, res) {
		if (err) {
		    intf.error(err);
		} else {
		    intf.client.breakpoints.splice(index, 1);
		    intf.commands['list'].run(intf.client.currentSourceLine - 1,
					      intf.client.currentSourceLine + 1);
		    intf.print(util.format("Deleted breakpoint %d", breakpoint));
		}
		intf.resume();
	    });
	}
    });
}
exports.Init = Init;
