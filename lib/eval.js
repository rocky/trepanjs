// extract the "expression" part of a line of source code.
function extract_expression(text) {
    if (text.match(/^\s*(?:if|while)\s+\((.+)\)\s*{/)) {
        text = text.replace(/^\s*(?:if|while)\s+\((.+)\)\s*{.*$/, '$1');
    } else if (text.match(/^\s*return\s+/)) {
        // EXPRESION in: return EXPRESSION
        text = text.replace(/^\s*return\s+/, '');
    } else if (text.match(/\s*[A-Za-z_][A-Za-z0-9_\[\]]*\s*=[^=>]/)) {
        // RHS of an assignment statement.
        text = text.replace(/^\s*[A-Za-z_][A-Za-z0-9_\[\]]*\s*=/, '');
    }
    return text;
}
exports.extract_expression = extract_expression;

/*
var stmts = ['if (condition(x)) { return null };',
             'while (expression) {',
             'return return_value;',
             'nothing_to_be.done'];
for (var i in stmts) {
    console.log(extract_expression(stmts[i]));
}
*/
