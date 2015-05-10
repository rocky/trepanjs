"use strict";
// Copyright 2015 Rocky Bernstein
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

var util = require('util'),
    misc = require('./misc'),
    path = require('path');

function SourceInfo(body, event) {
    var result = event + ' in ';

    if (body.script) {
	if (body.script.name) {
	    var name = body.script.name,
		dir = path.resolve() + '/';

	    // Change path to relative, if possible
	    if (name.indexOf(dir) === 0) {
		name = name.slice(dir.length);
	    }

	    result += misc.resolveFile(name);
	} else {
	    result += '[unnamed]';
	}
	result += util.format(" at line %s:%s", body.sourceLine + 1,
			      body.sourceColumn + 1);
    }

    if (body.exception) result += '\n' + body.exception.text;

    return result;
}

exports.SourceInfo = SourceInfo;
