// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var repl = require('./helper-debugger-repl.js');

repl.startDebugger('breakpoints.js', 13684);

var addTest = repl.addTest;

// Next
addTest('n', [
  /break in .* at line 11/,
  /10/, /11/, /12/
]);

// Display expression
addTest('display("\'x\'")',
       [/0: 'x'/]);

// Continue
addTest('c', [
  /break in .* at line 5/,
  /Displays:/,
  /0:\s+'x' = "x"/,
  /()/,
  /4/, /5/, /6/
]);

// Show displays
addTest('display', [
  /0:\s+'x' = "x"/
]);

// Undisplay
addTest('undisplay("\'x\'")');

// Step out
addTest('finish', [
  /break in .* at line 12/,
  /11/, /12/, /13/
]);

// Continue
addTest('c', [
  /break in .* at line 5/,
  /4/, /5/, /6/
]);

// Set breakpoint by function name
addTest('break("setInterval()", "!(setInterval.flag++)")', [
  /Breakpoint 2 set in file/
]);

// Continue
addTest('c', [
  /break in node.js at line \d+/,
  /xx\d/, /\d/, /\d/
]);

// REPL and process.env regression
addTest('shell', [
	/Type/,
	/Ctrl/,
        /help/
]);

addTest('for (var i in process.env) delete process.env[i]', []);

addTest('process.env', [
  /\{\}/
]);
