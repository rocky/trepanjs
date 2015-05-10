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

	    intf.client.breakpoints.some(function(bp, i) {
		if (bp.scriptId === script ||
		    bp.scriptReq === script ||
		    (bp.script && bp.script.indexOf(script) !== -1)) {
		    if (!utilCompat.isUndefined(index)) {
			ambiguous = true;
		    }
		    if (bp.line === line) {
			index = i;
			breakpoint = bp.id;
			return true;
		    }
		}
	    });

	    if (ambiguous) return intf.error('Script name is ambiguous');

	    if (utilCompat.isUndefined(breakpoint)) {
		return intf.error('Script : ' + script + ' not found');
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
		}
		intf.resume();
	    });
	}
    });
}
exports.Init = Init;
