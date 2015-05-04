In contrast to *gdb*-like debuggers, debugger commands are given as
valid JavaScript.

For example, to list a source text starting at line 5, you would type:
```js
list(5)
```
not:
```
list 5
```
Working this way is not without some drawbacks. The most notable
hidden consequence is that some common *gdb* command names can't be
used because they are JavaScript reserved words. Most notably:
*continue*, and *break*.

Huh? But notice that the corresponding *gdb* command *is* run when you
type those commands at a prompt. So let me explain...

There is an *alias* command. And that does string munging on the line
entered *before* evaluation. So I can catch a *leading* "continue"
string, and convert that to the official debugger command name:
`cont`. Likewise, a leading "break" with a space or parenthesis is
converted to the underlying command name `setBreakpoint`.

There is some other string preprocessing done.

The string-munging phase before evaluation adds a set of parenthesis
when the first word is a valid debugger command but the first word
isn't followed by anything. In other words, `quit` turns into `quit()`
before evaluation. Of course, if you typed `quit(5)`, I leave that
alone. And those commands that are getters, i.e. that can't take
parenthesis, are also left alone.

This string-munging is extended to include the most common case of two
words without parenthesis. So in the example first cited above
`list 5` is accepted and turned into `list(5)`.

But note string parameters still have to be marked as strings. So you
still need `help '*'` or `help('*')` rather than `help *`. If the
command takes more than one argument, you also need the
parenthesis. For example: `set("listsize", 10)` rather than `set
"listsize", 10`.
