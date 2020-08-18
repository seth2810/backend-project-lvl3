install:
	npm install

page-load:
	node bin/page-loader.js

lint:
	npx eslint .

test:
	DEBUG=nock.scope*,page-loader npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8

publish:
	npm publish --dry-run
