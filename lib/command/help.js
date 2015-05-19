"use strict";
// Copyright 2015 Rocky Bernstein
var columnize = require('../columnize'),
    fs = require('fs'),
    path = require('path'),
    utilCompat = require('../utilcompat');
/*===============================
  Debugger 'help' command
  =================================*/
var util  = require('util');

function Init(intf, Interface) {
    intf.defineCommand('help', {
	help: "Type **help**('*command-name*') to get help for \n\
command *command-name*.  \n\
Type **help('*')** for the list of all commands.  \n\
Type **help('syntax')** for help on command syntax.  \n\
\n\
Note above the use of parenthesis after \"help\" and the quotes when \n\
specifying a parameter.",
	aliases: ['h', '?'],
	run: function(what, suboption) {
	    if (!what) {
		intf.markupPrint(intf.commands['help'].help);
		return;
	    } else if (what == '*') {
		intf.section('List of debugger commands');
		var cmdList = Object.keys(intf.commands).sort();
		var opts = {displayWidth: intf.displayWidth,
			    ljust: true};
		intf.print(columnize.columnize(cmdList, opts), true);
		return;
	    } else if (what == 'syntax') {
		var filename = path.join(__dirname, "help", "syntax.md");
		fs.readFile(filename, 'utf8', function (err,data) {
		    if (err) {
			intf.error(err);
			return;
		    }
		    intf.markupPrint(data);
		});
		return;
	    } else if (what in intf.aliases) {
		what = intf.aliases[what].name
	    }
	    if (what in intf.commands) {
		var cmd = intf.commands[what];
		var helpObj = cmd.help;
		if (utilCompat.isFunction(helpObj)) {
		    helpObj(suboption);
		} else {
		    intf.markupPrint(helpObj);
		}
		if (cmd.aliases.length > 0) {
		    intf.section("\nAliases:");
		};
		intf.print(cmd.aliases.join(', '));
	    } else {
	      if (utilCompat.isFunction(what)) {
		var token = intf.cmdArgs[0];
		intf.error(util.format("%s evaluates to a function; " +
				       "perhaps you meant: help '%s'?",
				       token, token));
	      } else {
		intf.error(util.format("'%s' is not a debugger command",
				       what));
	      }
	    }
	}
    });
}

exports.Init = Init;
