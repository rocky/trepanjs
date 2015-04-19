# Debugger

    Stability: 3 - Beta

<!-- type=misc -->

V8 comes with an extensive debugger which is accessible out-of-process
via a simple
[TCP protocol](http://code.google.com/p/v8/wiki/DebuggerProtocol).  I
have forked the built-in debugger client in nodejs to adapt it to be
more featureful and follow the gdb and trepan command set better.


# Example

To use this debugger, run the `trepanjs` script. For example:

    % trepanjs example/myscript.js
    debugger listening on port 5858
    connecting to port 5858... ok
    (break in example/myscript.js:2)
      1 // myscript.js
    > 2 x = 5;
      3 setTimeout(function () {

What's going on above is that a child process of the debugger is
spawned and that then stops and listens on port 5858 for debugger commands.

trepanjs's debugger client doesn't support the full range of commands,
but simple step and inspection is possible. By putting the statement
`debugger;` into the source code of your script, you will enable a
breakpoint.

For example, suppose `myscript.js` looked like this:

    // myscript.js
    x = 5;
    setTimeout(function () {
      debugger;
      console.log("world");
    }, 1000);
    console.log("hello");

Then once the debugger is run, it will break on line 4.

    % trepanjs example/myscript.js
    node ./bin/trepanjs --no-highlight example/myscript.js 3 5
    debugger listening on port 5858
    connecting to port 5858... ok
    (break in example/myscript.js:2)
      1 // myscript.js
    > 2 x = 5;
      3 setTimeout(function () {
    (trepanjs) cont
    hello
    (break in example/myscript.js:4)
      3 setTimeout(function () {
    > 4   debugger;
      5   console.log("world");
    (trepanjs)
    debug> next
	(break in example/myscript.js:5)
      4   debugger;
    > 5   console.log("world");
      6 }, 1000);
    debug> shell
    Press Ctrl + C (SIGINT) to leave debug repl; .help gives REPL help
    > x
    5
    > 2+2
    %

As shown above, we use the debugger command `cont` instead of the gdb
command `continue` becuase *continue* is a Javascript reserved word.

The `shell` command allows you to evaluate code remotely. Right now,
leaving the Javascript REPL leaves the debugger as well. Without going
into a fill REPL as the *shell* command di, you can force evaluation
using the debugger's *eval()* command, e.g. `eval('x')

The `next` command steps over to the next line. There are a few other
commands available and more to come. Type `help` to see others.

## Watchers

You can watch expression and variable values while debugging your code.
On every breakpoint each expression from the watchers list will be evaluated
in the current context and displayed just before the breakpoint's source code
listing.

To start watching an expression, type `watch("my_expression")`. `watchers`
prints the active watchers. To remove a watcher, type
`unwatch("my_expression")`.

## Command reference

### Stepping Commands

* `cont`, `c` - Continue execution
* `next`, `n` - Step over
* `step`, `s` - Step in
* `finish`, - Step out
* `pause` - Pause running code (like pause button in Developer Tools)

### Breakpoints

* `setBreakpoint()`, `sb()` - Set breakpoint on current line
* `setBreakpoint(line)`, `sb(line)` - Set breakpoint on specific line
* `setBreakpoint('fn()')`, `sb(...)` - Set breakpoint on a first statement in
functions body
* `setBreakpoint('script.js', 1)`, `sb(...)` - Set breakpoint on first line of
script.js
* `clearBreakpoint`, `cb(...)` - Clear breakpoint

It is also possible to set a breakpoint in a file (module) that
isn't loaded yet:

    % ./trepanjs test/fixtures/break-in-module/main.js
    < debugger listening on port 5858
    connecting to port 5858... ok
    break in test/fixtures/break-in-module/main.js:1
      1 var mod = require('./mod.js');
      2 mod.hello();
      3 mod.hello();
    debug> setBreakpoint('mod.js', 23)
    Warning: script 'mod.js' was not loaded yet.
      1 var mod = require('./mod.js');
      2 mod.hello();
      3 mod.hello();
    debug> c
    break in test/fixtures/break-in-module/mod.js:23
     21
     22 exports.hello = function() {
     23   return 'hello from module';
     24 };
     25
    debug>

### Info

* `backtrace`, `bt` - Print backtrace of current execution frame
* `list(5)` &mdash; List scripts source code with 5 line context (5 lines before and
4 after)
* `watch(expr)` &mdash; Add expression to watch list
* `unwatch(expr)` &mdash; Remove expression from watch list
* `watchers` &mdash; List all watchers and their values (automatically listed on each
breakpoint)
* `shell` - Open node repl but evaluation is in debugging script's context.

### Execution control

* `run` &mdash; Run script (automatically runs on debugger's start)
* `restart` &mdash; Restart script
* `kill` &mdash; Kill child Javascript process
* `quit` `q`, &mdash terminate debugger
* `exit` &mdash like `quit` but you pass a return code

### Various

* `infoFiles` &mdash; List all loaded scripts
* `showArgs` &mdash; debugged program invocation arguments. These are used on `run` and `restart`
* `version` &mdash Display v8's version

## Advanced Usage

The V8 debugger can be enabled and accessed either by starting the trepanjs
sciprt or by signaling an existing Node process with `SIGUSR1`.

Once a process has been set in debug mode with this it can be connected to
with the trepanjsger. Either connect to the `pid` or the URI to the debugger.
The syntax is:

* `trepanjs -p <pid>` - Connects to the process via the `pid`
* `trepanjs <URI>` - Connects to the process via the URI such as localhost:5858

# Differences from gdb and the Trepanning debugger family

Over time I hope to reduce the differences, and right now there are
many.  But a few general observtions. The most obvious difference is
that commands that get evaluated are Javascript commands. So when you
need to pass arguments to a debugger command you enclose it in parenthesis.
For example:

    list(5)  // lists 5 lines

Running `list 5` as you might do in gdb will produce an error like this:

    (trepanjs) list 5
    SyntaxError: Unexpected number
        at Interface.controlEval ...

Running list *without* the parentheses produces something else that may
seem weird at first:

    (trepanjs) list
	[Function]

What's going on here is the debugger is reporting that `list` is a
valid function; you need to invoke it with parenthsis. Javascript
doesn't check that the number of parameter matches, so leaving off the
count is okay; `list()` will run the default number of list lines
&mdash; 5 before the current line, the current line and 4 after the
current line.

To make things a little more confusing, there are the debugger
commands that *don't* take any arguments don't allow
parenthesis. These are the commands *quit*, *step*, *next*, *finish*,
*version*, among others. If you give parenthesis here, you'll get an error:

    version()
    TypeError: Property 'version' of object #<Object> is not a function
    at repl:1:1
	...
    3.14.5.9

Again, down the line I hope to sort some of this out.
