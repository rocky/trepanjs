// extract the "expression" part of a line of source code.
function extract_expression(text) {
    if (text.match(/^\s*(?:if|while)\s+\((.+)\)\s*{/)) {
        text = text.replace(/^\s*(?:if|while)\s+\((.+)\)\s*{.*$/, '$1');
    } else if (text.match(/^\s*return\s+/)) {
        // EXPRESION in: return EXPRESSION
        text = text.replace(/^\s*return\s+/, '');
    } else if (text.match(/^\s*(?:var\s)?[A-Za-z_][A-Za-z0-9_\[\]]*\s*=[^=;]/)) {
        // RHS of an assignment statement.
        text = text.replace(/^\s*(?:var\s)?\s*[A-Za-z_][A-Za-z0-9_\[\]]*\s*=\s*(.+)[;,]$/, '$1');
    }
    return text;
}
exports.extract_expression = extract_expression;

if (process.argv[1] == __filename) {
    var stmts = ['var id = rhs;',
             'if (condition(x)) { return null };',
		 'while (expression) {',
		 'return return_value;',
		 'lhs = rhs;',
		 'var x = 5,',
		 'nothing_to_be.done'];
    for (var i in stmts) {
	console.log(extract_expression(stmts[i]));
    }
}
