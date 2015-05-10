"use strict";
// Copyright 2015 Rocky Bernstein
/*=============================
  Debugger 'backtrace' command
  ===============================*/
var misc = require('../misc'),
    utils = require('util');

function fnArgs(frame, name) {
    if (frame.arguments.length === 0) {
	return name + '()'
    } else {
	var args = [];
	frame.arguments.forEach(function(obj) {
	    args.push(obj.name);
	});
	return name + '(' + args.join(', ') + ')';
    }
}

function fnAndArgs(frame) {
    if (frame.func.name && frame.func.name.length > 0) {
	return fnArgs(frame, frame.func.name) +
	    '\n  called from file ';
    } else if (frame.func.inferredName &&
	       frame.func.inferredName.length > 0) {
	return fnArgs(frame, frame.func.inferredName) +
	    '\n  called from file ';
    } else {
	return 'in file ';
    }
}

function Init(intf, Interface) {

    intf.defineCommand('backtrace', {
	aliases: ['bt', 'where'],
	help: "**backtrace**([*count*])\n\
\n\
Print a stack trace, with the most recent frame at the top. With a positive number, print\n\
at most many entries.\n\
\n\
An arrow indicates the 'current frame'. The current frame determines the context used for\n\
many debugger commands such as expression evaluation or source-line listing.\n\
\n\
Examples:\n\
---------\n\
\n\
   backtrace    // Print a full stack trace\n\
   backtrace 2  // Print only the top two entries\n\
See also:\n\
`info('frame')",
	connection: true,
	run: function(count) {
	    var client = intf.client;

	    intf.pause();
	    client.fullTrace(function(err, bt) {
		if (err) {
		    intf.error("Can't request backtrace now");
		    intf.resume();
		    return;
		}

		if (bt.totalFrames == 0) {
		    intf.print('(empty stack)');
		} else {
		    var trace = [],
			firstFrameNative = bt.frames[0].script.isNative,
			elided = false;

		    count || (count = intf.maxStack);
		    if (count < bt.frames.length) {
			elided = true;
		    } else {
			count = bt.frames.length;
		    }
		    for (var i = 0; i < count; i++) {
			var frame = bt.frames[i];
			if (!firstFrameNative && frame.script.isNative) break;

			var prefix = (intf.backtraceIndex == i) ? '->' : '##';
			var text = prefix + i + ' ';
			text += fnAndArgs(frame);
			var path = frame.script.name;
			/* See if path exists. If not we try to
			   fully qualify it. But we aren't doing the
			   best thing here. First, this should be done
			   only under an option to do so.
			   Second, we are running this in the environment
			   of the debugger, not the environment of the
			   debugged code. */
			text += misc.resolveFile(path);
			var line_text = util.format(' at line %d:%d',
						    frame.line+1,
						    frame.column+1);
			if (text.length + line_text.length >
			    intf.displayWidth) text += "\n "
			text += line_text;
			trace.push(text);
		    }

		    if (elided) trace.push('...');
		    intf.print(trace.join('\n'));
		}

		intf.resume(true);
	    });
	}
    });
}

exports.Init = Init;
