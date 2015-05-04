/* Return compact set of columns as a string with newlines for an
   array of strings.

   Adapted my python columnize package
*/

var extend = require('util')._extend;
var util = require('util');

function lpad(str, size) {
    if (str.length >= size) return str;
    var suffix = Array(size - str.length + 1).join(' ');
    return str + suffix;
}

function rpad(str, size) {
    if (str.length >= size) return str;
    var prefix = Array(size - str.length + 1).join(' ');
    return prefix + str;
}

// Figure out a reasonable default with. Use os.environ['COLUMNS'] if
//   possible, and failing that use 80.
function computedDisplayWidth() {
    var cols = parseInt(process.env['COLUMNS'], 10);
    var width = 80;
    if ( cols ) {
	width = cols;
    }
    return width;
}
exports.computedDisplayWidth = computedDisplayWidth;

var defaultOpts = {
    arrangeArray:    false,
    arrangeVertical: true,
    arrayPrefix:     '',
    arraySuffix:     '',
    colfmt:           null,
    colsep:           '  ',
    displayWidth:     computedDisplayWidth(),
    linePrefix:       '',
    lineSuffix:       "\n",
    ljust:           true,
    termAdjust:      false
};

function getOption(key, options) {
    return options[key] || defaultOpts[key];
}

/*
  Return a list of strings as a compact set of columns arranged
  horizontally or vertically.

  For example, for a line width of 4 characters (arranged vertically):
  ['1', '2,', '3', '4'] => '1  3\n2  4\n'

  or arranged horizontally:
  ['1', '2,', '3', '4'] => '1  2\n3  4\n'

  Each column is only as wide as necessary.  By default, columns are
  separated by two spaces - one was not legible enough. Set "colsep"
  to adjust the string separate columns. Set `displayWidth' to set
  the line width.

  Normally, consecutive items go down from the top to bottom from
  the left-most column to the right-most. If "arrange_vertical" is
  set false, consecutive items will go across, left to right, top to
  bottom.
*/
function columnize(array, opts) {
    opts || (opts = {});

    if (!Array.isArray(array)) {
	throw '1st argument needs to be an Array';
ppp    };
    var o = {};

    if (Object.keys(opts).length > 0) {
        for (var key in defaultOpts) {
            o[key] = getOption(key, opts)
	}
        if (o.arrangeArray) {
            o.arrayPrefix  = '[';
            o.linePrefix   = ' ';
            o.lineSuffix   = ",\n";
            o.arraySuffix = "]\n";
            o.colsep       = ', ';
            o.arrangeVertical = false;
	}
    } else {
	o = extend({}, defaultOpts);
    }
    if (o.colfmt) {
        array = array.map(function(i) {return util.format(o.colfmt, i)});
    } else {
        array = array.map(function(i) {return util.format("%s", i)});
    }

    var size = array.length;
    if (0 == size) {
        return "<empty>\n";
    } else if (size == 1)  {
        return util.format('%s%s%s\n',
			   o.arrayPrefix, array[0],
                           o.arraySuffix);
    }
    if (o.displayWidth - o.linePrefix < 4) {
        o.displayWidth = o.linePrefix.length + 4;
    } else {
        o.displayWidth -= o.linePrefix.length;
    }

    o.displayWidth = Math.max(4, o.displayWidth - o.linePrefix.length);
    if (o.arrangeVertical) {
	array_index = function(nrows, row, col) {
	    return nrows*col + row;
	};
        // Try every row count from 1 upwards
	var nrows;
	var ncols;
        for (nrows = 1; nrows < size; nrows++) {
            ncols = Math.ceil(size / nrows);
            colwidths = [];
            totwidth = -o.colsep.length;
            for (var col=0 ; col < ncols; col += 1) {
                // get max column width for this column
                colwidth = 0;
                for (var row=0; row < nrows; row++) {
                    i = array_index(nrows, row, col);
                    if (i >= size) { break; };
                    x = array[i];
                    colwidth = Math.max(colwidth, x.length);
		}
                colwidths.push(colwidth);
                totwidth += colwidth + o.colsep.length;
                if (totwidth > o.displayWidth) {
                    break;
		}
	    }
            if (totwidth <= o.displayWidth) {
                break;
	    }
	}
        // The smallest number of rows computed and the
        // max widths for each column has been obtained.
        // Now we just have to format each of the
        // rows.
        var s = '';
        for (var row=0; row<nrows; row++) {
            var texts = [];
            for (var col=0; col<ncols; col++) {
                i = row + nrows*col;
                if (i >= size) {
                    x = "";
                } else {
                    x = array[i];
		}
                texts.push(x);
	    }
            while (texts && !texts[texts.length-1]) {
                texts.pop();
	    }
	    var padFn = o.ljust ? lpad : rpad;

            for (var col=0; col<texts.length; col++) {
                texts[col] = padFn(texts[col], colwidths[col]);
	    }
            s += util.format("%s%s%s",
			     o.linePrefix, texts.join(o.colsep),
                             o.lineSuffix);
        }
        return s;
    } else {
	console.log('To be continued...');
    }

}
exports.columnize = columnize;
