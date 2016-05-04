# CHANGES

## Filter by object version (unreleased)

- API addition: Allow supplying objects to `filter()`

## Schema version (unreleased)

- API change (breaking): Will delete unused indexes by default; set a new
    property `clearUnusedIndexes` if not desired (when using `schema` or
    `whole`-type `schema` objects within `schemas`)
- API addition: Support a `clearUnusedStores` option property to
    conditionally avoid deleting old stores (when using `schema` or
    `whole`-type `schema` objects within `schemas`).
- API addition: Support a `schemas` object. Its keys are the schema versions
    and its values are--if `schemaType` is `"mixed"` (the default, unless
    `schema` is used, in which case, it will be treated as `"whole"`)--arrays
    containing an object whose single key is the schema type for that version
    (either `"idb-schema"`, `"merge"`, or `"whole"`) and whose values are
    `schema` objects whose structure differs depending on the schema type.
    If `schemaType` is not `"mixed"` (`"whole"`, `"idb-schema"`, or `"merge"`),
    each `schemas` key will be a schema version and its value a single
    "schema object" (or, in the case of `"idb-schema"`, the function that
    will be passed the `IdbSchema` instance). Where an object is expected,
    one may also use a function which resolves to a valid object.
- API addition: Support `moveFrom` and `copyFrom` for moving/copying a store
    wholesale to another new store.
- API addition: Support a `schemaBuilder` callback which accepts an
    [idb-schema](http://github.com/treojs/idb-schema) object for incremental,
    versioned schema building and whose `addCallback` method will be
    passed an enhanced `upgradeneeded` event object that will be passed a
    `Server` object as its second argument for making db.js-style queries
    (e.g., to modify store content). This option differs from `schemas` used
    with `idb-schema` in that it adds the versions as well as stores and
    indexes programmatically. Addresses issues #84/#109
- API addition: If there is an upgrade problem, one can use a `retry` method
    on the error event object
- Fix: Add Promise rejection for `update()`.
- Documentation: Update `version` to take `schemaBuilder` into account
    (and document `schemaBuilder`).

## Unreleased

- Breaking change: Change `db.cmp()` to return a `Promise` to deliver
    the result
- Breaking change (minor): Ensure `Promise` rejections return `Error` objects
    rather than strings
- Breaking change (minor): Change bad keys error message
- Deprecated: on `schema.indexes`, in place of the index `key` property,
    `keyPath` should be used.
- API fix: Disallow `map` on itself (only one will be used anyways);
- API addition: Add Server aliases, `put` and `delete` (or `del`) and `db.del`
    as a `db.delete` alias.
- API change: Allow `desc`, `distinct`, `filter`, `keys`, `map`, `modify`
    on `limit`;
- API change: Allow `limit` on `distinct`, `desc`, `keys`;
- API change: Allow `{item:...}` without `key` for sake of unambiguity
- API change: Allow `add`/`update` items to be of any value including
    `undefined` or `null`
- API change: Allow Mongoifying of `add`/`update`/`remove` keys
- API change: Disallow key in `count()` if `null`;
- Cross-browser support: Auto-wrap user-supplied `Server.error()` and
    `Server.addEventListener('error', ...)` handlers with `preventDefault`
    so as to avoid hard `ConstraintError` aborts in Firefox.
- Cross-browser support: add `preventDefault` in error listener so that
    `onupgradeneeded` errors will not become reported in Firefox (though it
    will occur regardless)
- Cross-browser support (minor): wrap `delete` `onblocked` event's
    `newVersion` (=`null`) with `Proxy` but avoid using using `Proxy`
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
