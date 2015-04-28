function five() {
    var a = 5;
    return a;
}
function four() {
    var a = -1;
    a = five() - a;
    return a;
}
var a = 10;
var c = four();
