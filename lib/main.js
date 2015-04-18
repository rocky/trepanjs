/* This is pretty much a duplicate of bin/trepanjs
   We may remove it in the future.
*/
"use strict";
var trepanjs = require('./lib/debugger');
trepanjs.main(process.argv.slice(2));
