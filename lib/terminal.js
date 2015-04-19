// Copyright 2015 Rocky Bernstein
var esc = '\u001b[',
    colorCodes = {
	reset: esc + "39;49;00m",
	bold : esc + "01m",
	underline: esc + "04m"
    };

var esc = '\u001b[',
    colorCodes = {
	reset: esc + "39;49;00m",
	bold : esc + "01m",
	underline: esc + "04m"
    };

function bolden(text) {
    return colorCodes.bold + text + colorCodes.reset;
}

exports.bolden = bolden;

function underline(text) {
    return colorCodes.underline + text + colorCodes.reset;
}
exports.underline = underline;
