util = require('util');
console.log(util.format("My pid is %d", process.pid));

function sleep(s) {
    var e = new Date().getTime() + (s * 1000);
    while (new Date().getTime() <= e) {
        ;
    }
};

while (true) {
    sleep(1);
}
