##### Table of Contents

* [Debugger](#debugger)
  * [Example](#example)
  * [Command Reference](#cmd-ref)
    * [Displays](#displays)
    * [Stepping](#stepping)
    * [Breakpoints](#brkpts)
    * [Program State](#state)
    * [Execution control](#ctrl)
    * [Set](#set)
    * [Show](#show)
    * [Info](#info)
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
    break in example/myscript.js:2
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
    break in example/myscript.js:2
      1 // myscript.js
    > 2 x = 5;
      3 setTimeout(function () {
    (trepanjs) continue
    hello
    break in example/myscript.js:4
      3 setTimeout(function () {
    > 4   debugger;
      5   console.log("world");
    (trepanjs) next
	break in example/myscript.js:5
      4   debugger;
    > 5   console.log("world");
      6 }, 1000);
    (trepanjs) shell
    Press Ctrl + C (SIGINT) to leave debug repl; .help gives REPL help
    > x
    5
    > 2+2
    %

The `shell` command allows you to evaluate code remotely. Right now,
leaving the Javascript REPL leaves the debugger as well. Without going
into a fill REPL as the *shell* command , you can force evaluation
using the debugger's *eval()* command, e.g. `eval('x')`.

The `next` command steps over to the next line. There are a few other
commands available and more to come. Type `help` to see others.

<a name="cmd-ref"/>
## Command Reference

<a name="displays"/>
### Displays

* `display`, &ndash; add a display expression
* `undisplay` &ndash; remove a previously set display expression

You can display expression and variable values while debugging your code.
On every breakpoint each expression from the display list will be evaluated
in the current context and displayed just before the breakpoint's source code
listing.

To start watching an expression, type `display("my_expression")`. `infoDisplay`
prints the active watchers. To remove a watcher, type
`undisplay("my_expression")`.

<a name="stepping"/>
### Stepping Commands

* `cont`, `continue`, `c` &ndash; Continue execution
* `next`, `n` &ndash; Step over
* `step`, `s` &ndash; Step in
* `finish`, `fin` &ndash; Step out
* `pause` &ndash; Pause running code (like pause button in Developer Tools)

<a name="brkpts"/>
### Breakpoints

* `setBreakpoint()`, `break`, `b()` &ndash; Set breakpoint on current line
* `setBreakpoint(line)`, `break(line)`, `b(line)` &ndash; Set breakpoint on specific line
* `setBreakpoint('fn()')`, `break(fn()`, `b(fn())` &ndash; Set breakpoint on a first statement in
*fn*'s function body
* `setBreakpoint('script.js', 1)`, `b(...)` &ndash; Set breakpoint on first line of
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
    (trepanjs) setBreakpoint('mod.js', 23)
    Warning: script 'mod.js' was not loaded yet.
      1 var mod = require('./mod.js');
      2 mod.hello();
      3 mod.hello();
    (trepanjs) c
    break in test/fixtures/break-in-module/mod.js:23
     21
     22 exports.hello = function() {
     23   return 'hello from module';
     24 };
     25
    (trepanjs)

<a name="state"/>
### Program State

* `backtrace`, `bt` &ndash; Print backtrace of current execution frame
* `list()` &ndash; List scripts source code. You can also give a starting line
and an ending line breakpoint like this: `list(43,45)`. If the ending line is less than
the starting line, then it is taken to be a count. So `list(43,3)` is the same thing.
* `shell` &ndash; Open node repl but evaluation is in debugging script's context.

<a name="ctrl"/>
### Execution control

* `run` &ndash; Run script (automatically runs on debugger's start)
* `restart` &ndash; Restart script
* `quit` `q`, `exit` &ndash; terminate debugger. You can pass a number to set the exit code. For example `quit(1)` will quit with exit code 1. The default exit code is 0.

<a name="show"/>
### Show

* `show('args')` &ndash; debugged program invocation arguments. These are used on `run` and `restart`
* `show('listSize')` &ndash; number of lines displayed in a `list` command
* `show('version')` &ndash; Display trepanjs' and v8's version
* `show('width)` &ndash; terminal width

<a name="info"/>
### Info
* `infoBreakpoints` &ndash; List registered breakpoints
* `infoDisplay` &ndash; List all displays
* `infoFiles` &ndash; List all loaded scripts

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
    <td>infoBreakpoints</td>
    <td>breakpoints</td>
  <tr>
    <td>display</td>
    <td>watch</td>
  </tr>
  <tr>
    <td>undisplay</td>
    <td>unwatch</td>
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
  <tr>
    <td>show('version')</td>
    <td>version</td>
  </tr>
</table>

Over time this table may grow, and the differences between this and
other trepan debugger shrink. There is a ways to go to get this be
more like *gdb*.

A few general observations. The most obvious difference is that commands
that get evaluated are Javascript commands. So when you need to pass
arguments to a debugger command you enclose it in parenthesis.  For
example:

    list(5)  // list source code starting from line 5

Running `list 5` as you might do in *gdb* will produce an error like this:

    (trepanjs) list 5
    SyntaxError: Unexpected number
        at Interface.controlEval ...

In cases, like the *list* command, where all parameters are optional, it is okay to leave off the parenthesis. The evaluator will detect that parenthesis were left off, and then supply an empty set. So `list` will effectively be turned into `list()`.

And while on the topic of the *list* command...  Although the command name hasn't changed, the way it works behaves differently. The one
here is more like *gdb*. Subsequent *list* commands continue from where you last left off. And if you supply a number parameter, it is the starting line location, not a number of lines before and after the current line. To specify how many lines to list, use `set(listSize, <count>)`.

We retain the *setBreakpoint* command, but we add aliases *b*, and *break*. The reason *break*, and *continue* are aliases rather than the command name is that these are also JavaScript reserved words. We have some fancy magic for taking your input transforming it for aliases. We however don't do that for command names.
