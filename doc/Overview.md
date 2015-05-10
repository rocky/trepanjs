##### Table of Contents

* [Debugger](#debugger)
  * [Example](#example)
  * [Other ways to enter the debugger](#advanced)
  * [Debugger Command Syntax](#syntax)
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
  * [Differences from gdb and the Trepanning debugger family](#diff)

<a name="debugger">
# Debugger
</a>

    Stability: 3 - Beta

<!-- type=misc -->

V8 comes with an extensive debugger which is accessible out-of-process
via a simple
[TCP protocol](https://code.google.com/p/v8-wiki/wiki/DebuggerProtocol).  I
have forked the built-in debugger client in nodejs to adapt it to be
more featureful and follow the *gdb* and *trepan* command set better.


<a name="example">
## Example
</a>

To use this debugger, run the `trepanjs` script. For example:

    % trepanjs example/myscript.js
    debugger listening on port 5858
    connecting to port 5858... ok
    break in example/myscript.js at line 2
       1 // myscript.js
    -> 2 x = 5;
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
    break in example/myscript.js at line 2
       1 // myscript.js
    -> 2 x = 5;
       3 setTimeout(function () {
    (trepanjs) continue
    hello
    break in example/myscript.js at line 4
       3 setTimeout(function () {
    -> 4   debugger;
       5   console.log("world");
    (trepanjs) next
	break in example/myscript.js at line 5
       4   debugger;
    -> 5   console.log("world");
       6 }, 1000);
       (trepanjs) shell
    Type .quit or press Ctrl + C (SIGINT) to leave shell.
    Ctrl + D (EOF) leaves everything!
    .help gives REPL help
    > x
    5
    > 2+2
	4
	> .quit
    (trepanjs)

If the first token of input is not a debugger command, the line is
evaluated in the context of the debugged program. Of course there may
be expressions that conflict with debugger commands. For example, you
may have a variable called *s* and that will interfere with the
debugger alias for *step*.

The `shell` command allows you to evaluate code remotely. Without
going into a full REPL as the *shell* command , you can force
evaluation using the debugger's *eval()* command, e.g. `eval('s')`.

The `next` command steps over to the next line. There are a few other
commands available and more to come. Type `help` to see others.

<a name="advanced"/>
## Other ways to enter the debugger
</a>

As we saw above, the V8 debugger can be enabled and accessed either by
starting via *trepanjs*, but there are other ways go get into the
debugger

Using either the `--debug`, or `--debug-brk` command-line flags or by
signaling an existing with `SIGUSR1`, the debugger will go into
debug mode.  Once a process is in debug mode with this it can be
connected to with *trepanjs* using the `--attach` flag. For example:

```console
$ node --debug myprogram.js  # or node --debug-brk ...
```

In another terminal:

```console
$ trepanjs --attach # add --port or --host if needed
```

<a name="syntax"/>
## Debugger Command Syntax

The most obvious difference between this debugger and other *gdb*-like
debuggers is that commands that get evaluated are Javascript
commands. So when you need to pass arguments to a debugger command you
enclose it in parenthesis.  For example:

    list(5)  // list source code starting from line 5

As a special hack, an evaluation preprocessing step turns `list 5` info `list(5)` and `list` into `list()`. But it doesn't catch  more elaborate things like `set('listsize', 10)` or adding quotes around parameters such as would be needed for `help *` to make it `help '*'` or `help('*')`.

And while on the topic of the *list* command...  Although the command name hasn't changed, the way it works behaves differently. The one
here is more like *gdb*. Subsequent *list* commands continue from where you last left off. And if you supply a number parameter, it is the starting line location, not a number of lines before and after the current line. A optional second parameter gives the ending line to stop listing at; however if that number is less than the starting line it is interpreted as a number of lines to count instead.

We retain the *setBreakpoint* command, but we add aliases *b*, and *break*. The reason *break*, and *continue* are aliases rather than the command name is that these are also JavaScript reserved words. We have some fancy magic for taking your input transforming it for aliases. We however don't do that for command names.

<a name="cmd-ref"/>
## Command Reference

*Note:* this lags a little behind in detail from what you can get from the help inside the debugger.

<a name="displays"/>
### Displays

* `display` &ndash; add a display expression
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
    debugger listening on port 5858
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
* `eval`, `eval?` &ndash; evaluate in the context of the debugged program.

<a name="ctrl"/>
### Execution control

* `run` &ndash; Run script (automatically runs on debugger's start)
* `restart` &ndash; Restart script
* `quit` `q`, `exit` &ndash; terminate debugger. You can pass a number to set the exit code. For example `quit(1)` will quit with exit code 1. The default exit code is 0.

<a name="set"/>
### Set
* `set('args')` &ndash; set  debugged program invocation arguments. These are used on `run` and `restart`
* `set('listsize')` &ndash; set number of lines displayed in a `list` command
* `show('width)` &ndash; set terminal width

<a name="show"/>
### Show

* `show('args')` &ndash; debugged program invocation arguments. These are used on `run` and `restart`
* `show('listsize')` &ndash; number of lines displayed in a `list` command
* `show('version')` &ndash; Display trepanjs' and v8's version
* `show('width)` &ndash; terminal width

<a name="info"/>
### Info
* `info('breakpoints')` &ndash; List registered breakpoints
* `info('display')` &ndash; List all displays
* `info('files')` &ndash; List all loaded scripts

<a name="diff"/>
## Differences from gdb and the Trepanning debugger family

For those that are used to the *nodejs* debugger command set, note
that I've added an *alias* command you used to get those other names
in.

A number of the status and error messages are different as they more
closely follow message in the other trepannning debuggers. Often give
status is given a debugger command succeeds rather than the old
Unix-style of no output just prompt.

Frame-changing commands, *up*, *down*, and *frame* have been
added. Evaluation changes with the context of the current frame set.

Evaluation of input whose first token is not a debugger command is
done in the context of the debugged program. This differes from *node
debug*. If you have a variable *myvar* in your program, and you enter
`myvar`, you'll see that value. In *node debug*, you'll get a
reference error because *myvar* is not a debugger command.

### Command differences
Here is a table of specific command differences:

<table>
  <tr>
    <th>trepanjs</th>
    <th>nodejs</th>
  </tr>
  <tr>
    <td>info('breakpoints')</td>
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
    <td>info('files')</td>
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
