/*=================================
  Debugger 'frame' command
  ===================================*/

function Init(intf, Interface) {

    intf.defineCommand('frame', {
	connection: true,
	help: "**frame** *frame-number*\n\
\n\
Change the current frame to frame *frame-number* if specified, or the current frame, 0, if\n\
no frame number specified.\n\
See also:\n\
---------\n\
`up`, `down`",
	run: function(pos) {
	    pos || (pos = 0);
	    intf.adjustFrame(pos, true);
	}
    });
}

exports.Init = Init;
