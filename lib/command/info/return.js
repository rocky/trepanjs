// Copyright 2015 Rocky Bernstein
/*==============================================================
  Debugger info('return')' command
  =============================================================*/
var util  = require('util'),
    columnize = require('../../columnize');

function Init(name, subcmd) {
    return {
	help: "**info('return')**\n\
\n\
Information about a stack frame. This command only makes sense\n\
when stopped at a return.\n\
\n\
See also:\n\
---------\n\
`info('frame')`, `info('args')`, `info('locals')`",
      connection: true,
      run: function(intf) {
	intf.pause();
	intf.client.reqFrame(function(err, frame) {
	  if (err) {
	    intf.error(err);
	    intf.resume(true);
	  } else if (!frame.atReturn) {
	    intf.error("Not stopped at a return");
	    intf.resume(true);
	  } else {
	    // console.log(frame);
	    var ref = frame.returnValue.ref;
	    intf.client.reqLookup([ref], function(err, res) {
	      if (err) {
		intf.error(err);
		intf.resume(true);
		return;
	      } else {
		intf.print('type: ' + res[ref].type);
		intf.print('value: ' + res[ref].text);
		intf.resume(true);
	      }
	    });
	  };
	}, 0);
      }
    }
}

exports.Init = Init;
