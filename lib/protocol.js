// Protocol
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
//
// Parser/Serializer for V8 debugger protocol
// http://code.google.com/p/v8/wiki/DebuggerProtocol
//
// Usage:
//    p = new Protocol();
//
//    p.onResponse = function(res) {
//      // do stuff with response from V8
//    };
//
//    socket.setEncoding('utf8');
//    socket.on('data', function(s) {
//      // Pass strings into the protocol
//      p.execute(s);
//    });
//
//
function Protocol() {
    this._newRes();
}
exports.Protocol = Protocol;


Protocol.prototype._newRes = function(raw) {
    this.res = { raw: raw || '', headers: {} };
    this.state = 'headers';
    this.reqSeq = 1;
    this.execute('');
};


Protocol.prototype.execute = function(d) {
    var res = this.res;
    res.raw += d;

    switch (this.state) {
    case 'headers':
	var endHeaderIndex = res.raw.indexOf('\r\n\r\n');

	if (endHeaderIndex < 0) break;

	var rawHeader = res.raw.slice(0, endHeaderIndex);
	var endHeaderByteIndex = Buffer.byteLength(rawHeader, 'utf8');
	var lines = rawHeader.split('\r\n');
	for (var i = 0; i < lines.length; i++) {
            var kv = lines[i].split(/: +/);
            res.headers[kv[0]] = kv[1];
	}

	this.contentLength = +res.headers['Content-Length'];
	this.bodyStartByteIndex = endHeaderByteIndex + 4;

	this.state = 'body';

	var len = Buffer.byteLength(res.raw, 'utf8');
	if (len - this.bodyStartByteIndex < this.contentLength) {
            break;
	}
	// pass thru
    case 'body':
	var resRawByteLength = Buffer.byteLength(res.raw, 'utf8');

	if (resRawByteLength - this.bodyStartByteIndex >= this.contentLength) {
            var buf = new Buffer(resRawByteLength);
            buf.write(res.raw, 0, resRawByteLength, 'utf8');
            res.body =
		buf.slice(this.bodyStartByteIndex,
			  this.bodyStartByteIndex +
			  this.contentLength).toString('utf8');
            // JSON parse body?
            res.body = res.body.length ? JSON.parse(res.body) : {};

            // Done!
            this.onResponse(res);

            this._newRes(buf.slice(this.bodyStartByteIndex +
				   this.contentLength).toString('utf8'));
	}
	break;

    default:
	throw new Error('Unknown state');
	break;
    }
};


Protocol.prototype.serialize = function(req) {
    req.type = 'request';
    req.seq = this.reqSeq++;
    var json = JSON.stringify(req);
    return 'Content-Length: ' + Buffer.byteLength(json, 'utf8') +
        '\r\n\r\n' + json;
};
