# CHANGES

## Unreleased

- Breaking change: Change `db.cmp()` to return a Promise to deliver the result
- Breaking change: Ensure Promise rejections return Error objects rather
    than strings
- Deprecated: on `schema.indexes`, in place of the index `key` property,
    `keyPath` should be used.
- API addition: Add Server aliases, `put` and `delete`.
- Fix: Ensure there is a promise rejection for a bad schema callback or
    bad IDBKeyRange-related call.
- Fix: Error reporting with `Server.query().range()`.
- Fix: Actually implement documented chaining of (short) event handlers
- Docs: Badges, CHANGES, clarify `delete` behavior
- Testing improvements: Travis/Karma/PhantomJS/Grunt (including allowing
    override of Saucekey env var., overcoming PhantomJS issues with workers,
    testing `verionchange` events in another window, testing bad args)

## 0.14.0 (March 8, 2016)

- Enhancement: Add `addEventListener`, `removeEventListener` and
  `abort`/`error`/`versionchange` short equivalents;
- Docs: Clarify README re: recovering from blocked events
- Testing improvements

## 0.13.2 (March 2, 2016)

- Fix: Address issue [#144](https://github.com/aaronpowell/db.js/issues/144)
    by ensuring transaction error handlers are affixed before any
    transactional work
- Coding improvements

## 0.13.1 (March 2, 2016)

- Enhancement: Add `newVersion` and `oldVersion` where not supported
- Testing and coding improvements: Karma/Saucelabs/Grunt/PhantomJS,
    service workers

## 0.13.0 (March 1, 2016)

- Enhancement: Add blocked event handler to open() and delete() (with docs and
    tests) allowing additional "resume" promise property for user to easily
   resume promise chain (if blocking undone by closing old db connection)
- Cache server by version as well as name to allow upgrades of same name
    (and document);
- Enhancement: Support web workers/service workers and add tests
- Enhancement: Allow for consistent promise use (including for errors),
    deferring the error in the case of query preparation until execution
- Docs and coding improvements
- Testing improvements (Karma, Saucelabs, change to Mocha/Chai, unique
    test ids)
