# CHANGES

## Unreleased

- Breaking change: Change `db.cmp()` to return a `Promise` to deliver
    the result
- Breaking change (minor): Ensure `Promise` rejections return `Error` objects
    rather than strings
- Breaking change (minor): Change bad keys error message
- Deprecated: on `schema.indexes`, in place of the index `key` property,
    `keyPath` should be used.
- API fix: Disallow `map` on itself (only one will be used anyways);
- API addition: Add Server aliases, `put` and `delete`.
- API change: Allow `desc`, `distinct`, `filter`, `keys`, `map`, `modify`
    on `limit`;
- API change: Allow `limit` on `distinct`, `desc`, `keys`;
- API change: Allow `{item:...}` without `key` for sake of unambiguity
- API change: Allow `add`/`update` items to be of any value including
    `undefined` or `null`
- API change: Allow Mongoifying of `add`/`update`/`remove` keys
- API change: Disallow key in `count()` if null;
- Cross-browser support: Auto-wrap user-supplied `Server.error()` and
    `Server.addEventListener('error', ...)` handlers with `preventDefault`
    so as to avoid hard `ConstraintError` aborts in Firefox.
- Cross-browser support: add `preventDefault` in error listener so that
    `onupgradeneeded` errors will not become reported in Firefox (though it
    will occur regardless)
- Cross-browser support (minor): wrap `delete` `onblocked` event's
    `newVersion` (=null) with `Proxy` but avoid using using `Proxy`
    if not present for sake of PhantomJS or older browsers (Firefox);
    could not wrap `oldVersion`, however.
- Fix: Ensure there is a promise rejection for a bad schema callback,
    bad `IDBKeyRange`-related call, bad `createObjectStore`, bad index
    creation, bad function on `modify()` object, bad `modify` result,
    bad `map()` function, bad `filter`, and bad `update()`.
- Fix: Ensure `limit()` arguments are numeric
- Fix: Actually implement documented chaining of (short) event handlers
- Fix: Allow empty string index in `Server.query()`.
- Fix: Ensure the records from the `put` in `update()` have a `keyPath`
    property getter (as with `add()`) in case this was called without
    an `add()`
- Fix: Avoid adding `keyPath` property to `add`/`update` records if property
    is already present;
- Fix: Provide refactoring for IndexedDBShim (issue #87).
- Validation: Tighter checking on argument to `modify` method (ensure is
    an object) and on index creation objects (issue #149)
- Docs: Badges, CHANGES, clarify `add`, `update`, `delete`, `filter` and
    `modify` methods, `schema` property behavior, and querying with ranges.
- Testing improvements: Travis/Karma/PhantomJS/Grunt (including allowing
    override of Saucekey env var., overcoming PhantomJS issues with workers,
    testing `versionchange` events in another window, testing bad args,
    testing array and nested `keyPath`'s and indexes, ensure Firefox is
    passing as well as Chrome)

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
