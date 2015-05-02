var should = require('chai').should(),
    eval = require('../lib/eval'),
    extract_expression = eval.extract_expression;

describe('#extract_expression', function() {
    it('if (condition...) { ... } => condition;', function() {
	extract_expression('if (condition(x)) { return null };').should.equal('condition(x)');
	extract_expression('if (true) {').should.equal('true');
    });

    it('"while (expression) {" => expression', function() {
	extract_expression('while (expression) {').should.equal('expression');
    });

    it('"return return_value) {" => return_value', function() {
	extract_expression('return return_value').should.equal('return_value');
    });

    it('"nothing_done" => nothing_done', function() {
	extract_expression('nothing_done').should.equal('nothing_done');
    });

    it('"lhs = rhs;" => rhs', function() {
	extract_expression('lhs = rhs;').should.equal('rhs');
    });
    it('"var id = rhs;" => rhs', function() {
    	extract_expression('var id = rhs;').should.equal('rhs');
    });
});
