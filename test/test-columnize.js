var should = require('chai').should(),
    columnize = require('../lib/columnize'),
    col = columnize.columnize,
    opts = {displayWidth: 20, colsep: '  '};

describe('columnize', function() {
    it('columnize no entries', function() {
	col([], opts).should.equal('<empty>\n');
    });
    it('columnize one entry', function() {
	col(['oneitem'], opts).should.equal('oneitem\n');
    });
    it('columnize one line', function() {
	col(['one', 'two', 'three'], opts).should.equal('one  two  three\n');
    });

    it('columnize two lines', function() {
	opts = {displayWidth: 4, colsep: '  '};
	col(['1', '2', '3', '4'], opts).should.equal("1  3\n2  4\n");
    });

});
