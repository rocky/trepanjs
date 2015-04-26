/*=============================
  Debugger 'backtrace' command
  ===============================*/
var misc = require('../misc');

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
   backtrace 2  // Print only the top two entries",
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
			firstFrameNative = bt.frames[0].script.isNative;
		    count || (count = bt.frames.length);
		    count = Math.min(bt.frames.length, count);
		    for (var i = 0; i < count; i++) {
			var frame = bt.frames[i];
			if (!firstFrameNative && frame.script.isNative) break;

			var prefix = ' #' + i;
			// (intf.backtraceIndex == i) ? '->' : '##'
			var text = prefix + ' ';
			if (frame.func.name && frame.func.name.length > 0) {
			    text += frame.func.name + ' called from file ';
			} else if (frame.func.inferredName &&
				   frame.func.inferredName.length > 0) {
			    text += frame.func.inferredName + ' called from file ';
			} else {
			    text += 'in file ';
			}
			var path = frame.script.name;
			/* See if path exists. If not we try to
			   fully qualify it. But we aren't doing the
			   best thing here. First, this should be done
			   only under an option to do so.
			   Second, we are running this in the environment
			   of the debugger, not the environment of the
			   debugged code. */
			text += misc.resolveFile(path) + ' at line ';
			text += (frame.line + 1) + ':' + (frame.column + 1);

			trace.push(text);
		    }

		    intf.print(trace.join('\n'));
		}

		intf.resume();
	    });
	}
    });
}

exports.Init = Init;
