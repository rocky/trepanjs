/*========================================
  Debugger 'cont' command.

  Continues execution of the program.
  Note that the name has to be 'cont', not 'continue'
  since 'continue' is a Javascript reserved word.
  However we add an alias 'continue', which works around
  this.
  ==========================================*/
function Init(intf, Interface) {

    intf.defineCommand('cont', {
	help: 'cont\n\
\n\
Continues execution of the program',
	aliases: ['c', 'continue'],
	connection: true,
	run: function() {
	    intf.pause();

	    intf.client.reqContinue(function(err) {
		if (err) intf.error(err);
		intf.resume();
	    });
	}
    });
}
exports.Init = Init;
