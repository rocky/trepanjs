#: Run all tests
test: test-mocha

test-full: test-mocha test-debugger

#: Run mocha tests
test-mocha:
	./node_modules/.bin/mocha --reporter spec

#: Run debugger test framework from node
test-debugger:
	python tools/test.py -- --mode=release debugger message

.PHONY: test-mocha test-debugger test-full
