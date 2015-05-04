// Copyright 2015 Rocky Bernstein
/*============================================================
  Debugger setBreakpoint command.

  Sets a breakpoint.
  ==============================================================*/
var utilCompat  = require('../utilcompat'),
    misc = require('../misc');

function Init(intf, Interface)  {
    intf.defineCommand('setBreakpoint', {
	aliases: ['b', 'break'],
	help: '**setBreakpoint**(*line-or-fn*)\n\
\n\
set a breakpoint at the location indicated.\n\
\n\
Examples:\n\
   setBreakpoint(5) // set a breakpoint on line 5\n\
   setBreakpoint("setInterval()", "!(setInverval.flag++)")\n\
\n\
See also:\n\
---------\n\
`clearBreakpoint`, `info("breakpoints")`',
	connection: true,
	run: function(script, line,
                         condition, silent) {
	    var scriptId,
	        client = intf.client,
		ambiguous;

	    // setBreakpoint() should insert breakpoint on current line
	    if (utilCompat.isUndefined(script)) {
		script = client.currentScript;
		line = client.currentSourceLine + 1;
	    }

	    // setBreakpoint(line-number) should insert breakpoint in current script
	    if (utilCompat.isUndefined(line) && utilCompat.isNumber(script)) {
		line = script;
		script = client.currentScript;
	    }
	    if (/\(\)$/.test(script)) {
		// setBreakpoint('functionname()');
		var req = {
		    type: 'function',
		    target: script.replace(/\(\)$/, ''),
		    condition: condition
		};
	    } else {
		// setBreakpoint('scriptname')
		if (script != +script && !client.scripts[script]) {
		    var scripts = client.scripts;
		    Object.keys(scripts).forEach(function(id) {
			if (scripts[id] &&
			    scripts[id].name &&
			    scripts[id].name.indexOf(script) !== -1) {
			    if (scriptId) {
				ambiguous = true;
			    }
			    scriptId = id;
			}
		    });
		} else {
		    scriptId = script;
		}

		if (ambiguous) return intf.error('Script name is ambiguous');
		if (line <= 0) return intf.error('Line should be a positive value');

		var req;
		if (scriptId) {
		    req = {
			type: 'scriptId',
			target: scriptId,
			line: line - 1,
			condition: condition
		    };
		} else {
		    intf.print('Warning: script \'' + script + '\' was not loaded yet.');
		    var escapedPath = script.replace(/([/\\.?*()^${}]|[\]])/g, '\\$1');
		    var scriptPathRegex = '^(.*[\\/\\\\])?' + escapedPath + '$';
		    req = {
			type: 'scriptRegExp',
			target: scriptPathRegex,
			line: line - 1,
			condition: condition
		    };
		}
	    }

	    intf.pause();
	    client.setBreakpoint(req, function(err, res) {
		if (err) {
		    if (!silent) {
			intf.error(err);
		    }
		} else {
		    if (!silent) {
			// FIXME: we can only list lines if the script
			// is the same as the current frame.
			var scriptName = client.scripts[res.scriptId];
			if (scriptName == client.currentFrame) {
		    	    intf.list(res.line, res.line+2, res.script_id);
			}
		    }

		    // Try load scriptId and line from response
		    if (!scriptId) {
			scriptId = res.script_id;
			line = res.line + 1;
		    }

		    // Remember this breakpoint even if scriptId is not resolved yet
		    client.breakpoints.push({
			id: res.breakpoint,
			scriptId: scriptId,
			script: (client.scripts[scriptId] || {}).name,
			line: line,
			condition: condition,
			scriptReq: script
		    });
		    var resName = misc.resolveFile((client.scripts[scriptId] || {}).name),
			info = "Breakpoint " + res.breakpoint +
			" set in file " + resName + ", line " + line + ".";
		    intf.print(info);
		}
		intf.resume();
	    });
	}
    });

}

exports.Init = Init;
