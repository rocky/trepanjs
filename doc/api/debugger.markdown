##### Table of Contents

* [Debugger](#debugger)
  * [Example](#example)
  *  [Watchers](#watchers)
  * [Command Reference](#cmd-ref)
    * [Stepping](#stepping)
    * [Breakpoints](#brkpts)
    * [Info](#info)
    * [Execution control](#ctrl)
    * [Various](#various)
  * [Advanced Usage](#advanced)
  * [Differences from gdb and the Trepanning debugger family](#diff)

<a name="debugger">
# Debugger
</a>

    Stability: 3 - Beta

<!-- type=misc -->

V8 comes with an extensive debugger which is accessible out-of-process
via a simple
[TCP protocol](http://code.google.com/p/v8/wiki/DebuggerProtocol).  I
have forked the built-in debugger client in nodejs to adapt it to be
more featureful and follow the *gdb* and *trepan* command set better.


<a name="example">
## Example
</a>

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

```javascript
    // myscript.js
    x = 5;
    setTimeout(function () {
      debugger;
      console.log("world");
    }, 1000);
    console.log("hello");
```

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
command `continue` because *continue* is a Javascript reserved word.

The `shell` command allows you to evaluate code remotely. Right now,
leaving the Javascript REPL leaves the debugger as well. Without going
into a fill REPL as the *shell* command , you can force evaluation
using the debugger's *eval()* command, e.g. `eval('x')

The `next` command steps over to the next line. There are a few other
commands available and more to come. Type `help` to see others.

<a name="watchers"/>
## Watchers

You can watch expression and variable values while debugging your code.
On every breakpoint each expression from the watchers list will be evaluated
in the current context and displayed just before the breakpoint's source code
listing.

To start watching an expression, type `watch("my_expression")`. `watchers`
prints the active watchers. To remove a watcher, type
`unwatch("my_expression")`.

<a name="cmd-ref"/>
## Command Reference

<a name="stepping"/>
### Stepping Commands

* `cont`, `c` &ndash; Continue execution
* `next`, `n` &ndash; Step over
* `step`, `s` &ndash; Step in
* `finish`, &ndash; Step out
* `pause` &ndash; Pause running code (like pause button in Developer Tools)

<a name="brkpts"/>
### Breakpoints

* `setBreakpoint()`, `sb()` &ndash; Set breakpoint on current line
* `setBreakpoint(line)`, `sb(line)` &ndash; Set breakpoint on specific line
* `setBreakpoint('fn()')`, `sb(...)` &ndash; Set breakpoint on a first statement in
functions body
* `setBreakpoint('script.js', 1)`, `sb(...)` &ndash; Set breakpoint on first line of
script.js
* `clearBreakpoint`, `cb(...)` &ndash; Clear breakpoint

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

<a name="info"/>
### Info

* `backtrace`, `bt` &ndash; Print backtrace of current execution frame
* `list(5)` &ndash; List scripts source code with 5 line context (5 lines before and
4 after)
* `watch(expr)` &ndash; Add expression to watch list
* `unwatch(expr)` &ndash; Remove expression from watch list
* `watchers` &ndash; List all watchers and their values (automatically listed on each
breakpoint)
* `shell` &ndash; Open node repl but evaluation is in debugging script's context.

<a name="ctrl"/>
### Execution control

* `run` &ndash; Run script (automatically runs on debugger's start)
* `restart` &ndash; Restart script
* `kill` &ndash; Kill child Javascript process
* `quit` `q`, `exit` &ndash; terminate debugger

<a name="various"/>
### Various

* `infoFiles` &ndash; List all loaded scripts
* `showArgs` &ndash; debugged program invocation arguments. These are used on `run` and `restart`
* `version` &ndash Display v8's version

<a name="advanced"/>
## Advanced Usage
</a>

The V8 debugger can be enabled and accessed either by starting via *trepanjs*
or by signaling an existing Node process with `SIGUSR1`.

Once a process has been set in debug mode with this it can be connected to
with trepanjs. Either connect to the `pid` or the URI to the debugger.
The syntax is:

* `trepanjs -p <pid>` &ndash; Connects to the process via the `pid`
* `trepanjs <URI>` &ndash; Connects to the process via the URI such as localhost:5858

<a name="diff"/>
## Differences from gdb and the Trepanning debugger family

For those that are used to the *nodejs* debugger command set, note that I've added an
*alias* command you used to get those other names in. Here is a table of differences:

<table>
  <tr>
    <th>trepanjs</th>
    <th>nodejs</th>
  </tr>
  <tr>
    <td>infoFiles</td>
    <td>scripts</td>
  </tr>
  <tr>
    <td>finish</td>
    <td>out</td>
  </tr>
  <tr>
    <td>shell</td>
    <td>repl</td>
  </tr>
</table>

Over time this table may grow, and the differences between this and
other trepan debugger shrink. There is a ways to go to get this be
more like *gdb*.

A few general observations. The most obvious difference is that commands
that get evaluated are Javascript commands. So when you need to pass
arguments to a debugger command you enclose it in parenthesis.  For
example:

    list(5)  // lists 5 lines

Running `list 5` as you might do in gdb will produce an error like this:

    (trepanjs) list 5
    SyntaxError: Unexpected number
        at Interface.controlEval ...

In cases, like the *list* command, where all parameters are optional,
it is okay to leave off the parenthesis. The evaluator will detect
that parenthesis were left off, and then supply an empty set. So
`list` will effectively be turned into `list()`.
