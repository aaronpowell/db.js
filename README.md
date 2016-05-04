[![Build Status](https://travis-ci.org/aaronpowell/db.js.png?branch=master)](https://travis-ci.org/aaronpowell/db.js)
[![Selenium Test Status](https://saucelabs.com/buildstatus/aaronpowell)](https://saucelabs.com/u/aaronpowell)
[![npm version](https://img.shields.io/npm/v/db.js.svg?style=flat-square)](https://npmjs.org/packages/db.js)
[![bower version](https://img.shields.io/bower/v/db.js.svg?style=flat-square)](https://github.com/aaronpowell/db.js)
[![License](https://img.shields.io/github/license/aaronpowell/db.js.svg?style=flat-square)](https://github.com/aaronpowell/db.js/blob/master/LICENSE.md)

[![Selenium Test Status](https://saucelabs.com/browser-matrix/aaronpowell.svg)](https://saucelabs.com/u/aaronpowell)

# db.js

db.js is a wrapper for [IndexedDB](http://www.w3.org/TR/IndexedDB/) to
make it easier to work against, making it look more like a queryable API.

# Usage

Add a reference to db.js in your application before you want to use IndexedDB:

```html
<script src='/dist/db.js'></script>
```

Alternatively, db.js includes an optional `define` call, and can be loaded
as a module using the [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD)
loader of your choice.

## Opening/Creating a database and connection

Once you have the script included you can then open connections to each
different database within your application:

```js
var server;
db.open({
    server: 'my-app',
    version: 1,
    schema: {
        people: {
            // Optionally add parameters for creating the object store
            key: {keyPath: 'id', autoIncrement: true},
            // Optionally add indexes
            indexes: {
                firstName: {},
                answer: {unique: true}
            }
        }
    }
}).then(function (s) {
    server = s;
});
```

Note that `open()` takes an options object with the following properties:

- *version* - The current version of the database to open.
Should be an integer. You can start with `1`. You must increase the `version`
if updating the schema or otherwise the `schema` property will have no effect.
If the `schemaBuilder` property is used, `version` (if present) cannot be
greater than the highest version built by `schemaBuilder`.

- *server* - The name of this server. Any subsequent attempt to open a server
with this name (and with the current version) will reuse the already opened
connection (unless it has been closed).

- *schema* - Expects an object, or, if a function is supplied, a schema
object should be returned). A `schema` object optionally has store names as
keys (these stores will be auto-created if not yet added and modified
otherwise). The values of these store objects should be objects, optionally
with the property "key" and/or "indexes". The "key" property, if present,
should contain valid [createObjectStore](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/createObjectStore)
parameters (`keyPath` or `autoIncrement`)--or one may express `keyPath` and
`autoIncrement` directly inside the store object. The "indexes" property should
contain an object whose keys are the desired index keys and whose values are
objects which can include the optional parameters and values available to [createIndex](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/createIndex)
(`unique`, `multiEntry`, and, for Firefox-only, `locale`). Note that the
`keyPath` of the index will be set to the supplied index key, or if present,
a `keyPath` property on the provided parameter object. Note also that when a
schema is supplied for a new version, any object stores not present on
the schema object will be deleted unless `clearUnusedStores` is set to `false`
(the latter may be necessary if you may be sharing the domain with applications
building their own stores) and any unused indexes will also be removed unless
`clearUnusedIndexes` is set to `false`. One may also add a `moveFrom` or
`copyFrom` property to the store object to point to the name of a preexisting
store which one wishes to rename or copy.

- *schemas* - `schemas` is keyed by schema version and its values are--if
`schemaType` is `"mixed"` (the default, unless `schema` is used, in which
case, its default type will be `"whole"`)--arrays containing an object whose
single key is the schema type for that version (either `"idb-schema"`,
`"merge"`, or `"whole"`) and whose values are `schema` objects whose structure
differs depending on the schema type. If `schemaType` is not `"mixed"`
(`"whole"`, `"idb-schema"`, or `"merge"`), each `schemas` key will be a schema
version and its value a single "schema object" (or, in the case of
`"idb-schema"`, the function that will be passed the `IdbSchema` instance),
with no need to indicate type on an object. Where an object or array is
expected, one may also use a function which resolves to a valid object or
array. So, if the user was last on version 2 and now it is version 4, they will
first be brought to version 3 and then 4, while, if they are already on version
4, no further upgrading will occur but the connection will open. See the
section on "schema types" for more details on the behavior of the different
schema types.

- *schemaType* - Determines how `schemas` will be interpreted. Possible values
are `"whole"`, `"power"`, `"merge"`, or `"mixed"`. The default is `"mixed"`.
See the discussion under `schemas`. Note that if `schema` is used, it will
behave as `"whole"`.

- *schemaBuilder* - While the use of `schema` works more simply by deleting
whatever stores existed before which no longer exist in `schema` and creating
those which do not yet exist, `schemaBuilder` is a callback which will be
passed an [idb-schema](https://github.com/treojs/idb-schema)
object which allows (as with the plural `schemas` property) for specifying
an incremental path to upgrading a schema (as could be required if your
users might have already opened say version 1 of your database and you
have already made two upgrades to have a version 3 but the changes you have
for version 2 must first be applied). Besides precise control of versioning
(via `version()`) and, as with `schema`, the creating or deleting stores
and indexes (via `addStore`, `delStore`, `getStore` (then `addIndex`, and
`delIndex`)), `schemaBuilder` also offers `stores` for introspection on the
existing stores and, more importantly, `addCallback` which is passed the
`upgradeneeded` event and can be used for making queries such as modifying
store values. See the [idb-schema](https://github.com/treojs/idb-schema)
documentation for full details.

Note that the event object which is passed as the first argument to
`addCallback` is the underlying IndexedDB event, but in `db.js`, we call
these callbacks with a second argument which is the db.js `Server` object,
allowing for db.js-style queries during the `upgradeneeded` event as
desired (e.g.,
`.addCallback(function (e, server) {server.query(table).all().modify(...)});`)
with the exception that `close` is disallowed as this should not occur within
the `upgradeneeded` event. Note, however, that due to limitations with Promises
and the nature of the IndexedDB specification with regard to this event,
you may need to avoid use of Promises within these callbacks (though you can
run `addCallback` multiple times).

A connection is intended to be persisted, and you can perform multiple
operations while it's kept open.

In the event a connection has already been opened for modification (whether
in the same instance or in another tab/window), a blocking error will occur,
for which you can listen by adding a `Promise.catch` statement and
communicate with blocking instances still holding a connection so that
they may close the connection. You can then return the `resume` property
(a promise) to recover to continue the original `open` operation and
proceed to the following `then` condition.

```js
var server;
db.open({
    // ...
}).catch(function (err) {
    if (err.type === 'blocked') {
        oldConnection.close(); // `versionchange` handlers set up for earlier
                               //   versions (e.g., in other tabs) should have
                               //   ideally anticipated this need already (see
                               //   comment at end of this sample).
        return err.resume;
    }
    // Handle other errors here
    throw err;
}).then(function (s) {
    server = s;
    // One can add a versionchange handler here to self-close
    //   the connection upon future upgrade attempts (likely to
    //   be one made in other tabs) and thereby
    //   avoid such attempts having to face blocking errors.
});
```

Check out the `/tests/specs` folder for more examples.

## Schema types

Schemas can be expressed as one of the following types: `"whole"`,
`"idb-schema"`, `"merge"`, or `"mixed"`.

If `schema` is used, the default will be `"whole"`.

If `schemas` is used, the default will be `"mixed"`, but this can
be overridden with the `schemaType` property.

### "whole" type schemas

The `whole` type merge (the default for `schema`, but not for `schemas`)
is to delete all unreferenced stores or indexes, creating anew those
stores or indexes which did not exist previously, recreating those
stores or indexes with differences). Unless the options `clearUnusedStores`
or `clearUnusedIndexes` are set to `false`, unused stores and indexes
will also be deleted.

The advantage of this approach is that each "version" will give a clear
snapshot of all stores and indexes currently in use at the time. The
disadvantage is the same--namely, that it may end up being bulkier than
the other types which only indicate differences from the previous version.

The following will add a version 1 of the schema with a `person` store,
and add a version 2 of the schema, containing a `people`
store which begins with the data contained in the `person` store (though
deleting the `person` store after migrated), but overriding the `keyPath`
and `autoIncrement` information with its own and adding two indexes.
The store `addresses` will be preserved since it is re-expressed in version 2,
but `oldStore` will be removed since it is not re-expressed.

```js
schemaType: 'whole',
schemas: {
    1: {
        oldStore: {},
        person: {},
        addresses: {},
        phoneNumbers: {}
    },
    2: {
        addresses: {},
        phoneNumbers: {},
        people: {
            moveFrom: 'person',
            // Optionally add parameters for creating the object store
            keyPath: 'id',
            autoIncrement: true,
            // Optionally add indexes
            indexes: {
                firstName: {},
                answer: {unique: true}
            }
        }
    }
}
```

### "merge" type schemas

The `merge` type schema allows one to exclusively indicate changes between
versions without needing to redundantly indicate stores or indexes added
from previous versions.

`merge` type schemas behave similarly to [JSON Merge Patch](https://tools.ietf.org/html/rfc7396)
in allowing one to re-express those parts of the JSON structure that one
wishes to change, but with the enhancement that instead of overriding `null`
for deletions (and preventing it from being used as a value), the NUL string
`"\0"` will indicate deletions (if one wishes to add a value which actually
begins with NUL, one should supply an extra NUL character at the beginning
of the string).

One could use the `merge` type to implement the example shown under the `whole`
type section in the following manner:

```js
schemaType: 'merge',
schemas: {
    1: {
        oldStore: {},
        person: {},
        addresses: {},
        phoneNumbers: {}
    },
    2: {
        oldStore: '\0',
        people: {
            moveFrom: 'person',
            // Optionally add parameters for creating the object store
            keyPath: 'id',
            autoIncrement: true,
            // Optionally add indexes
            indexes: {
                firstName: {},
                answer: {unique: true}
            }
        }
    }
}
```

### "idb-schema" type schemas

This type of schema allows for sophisticated programmatic changes
by use of `idb-schema`'s '`addEarlyCallback` and `addCallback` and
other methods. One could use the `idb-schema` type to implement the
example shown under the `whole` type section in the following manner:

```js
schemaType: 'idb-schema',
schemas: {
    1: function (idbschema) {
        idbschema.addStore('oldStore').addStore('person').addStore('addresses').addStore('phoneNumbers');
    },
    2: function (idbschema) {
        idbschema.delStore('oldStore').renameStore('person', 'people', {keyPath: 'id', autoIncrement: true})
            .addIndex('firstName', 'firstName')
            .addIndex('answer', 'answer', {unique: true});
    }
}
```

(Note that using the `schemaBuilder` function would behave similarly, except
that the versions would also need to be built programmatically (via calls to
`version()`).)

### "mixed" type schemas

The `mixed` type is the default type for `schemas` (but not for `schema`). It
adds a little verbosity but allows you to combine any of the types across and
even within a version.

One could use the `mixed` type to implement the example shown under
the `whole` type section in such as the following manner:

```js
schemas: {
    1: [
        {'whole': {
            addresses: {},
            phoneNumbers: {}
        }},
        {'idb-schema': function (idbschema) {
            idbschema.addStore('oldStore').addStore('person');
        }}
    ],
    2: [{'merge': {
        oldStore: '\0',
        people: {
            moveFrom: 'person',
            // Optionally add parameters for creating the object store
            keyPath: 'id',
            autoIncrement: true,
            // Optionally add indexes
            indexes: {
                firstName: {},
                answer: {unique: true}
            }
        }
    }}]
}
```

## General server/store methods

Note that by default the methods below (not including `close`,
`addEventListener`, and `removeEventListener`) can be called either as
`server.people.xxx( arg1, arg2, ... )` or
`server.xxx( 'people', arg1, arg2, ... )`.

To reduce some memory requirements or avoid a however unlikely
potential conflict with server method names, however, one may supply
`noServerMethods: true` as part of options supplied to `db.open()`
and under such conditions, only the second method signature above can be
used.

### Store modification

#### Adding items

```js
server.people.add({
    firstName: 'Aaron',
    lastName: 'Powell',
    answer: 42
}).then(function (item) {
    // item stored
});
```

Multiple items can be added as additional arguments to `add`. Another way
multiple items can be added is when an array is supplied for any of the
arguments in which case, its top level contents will be treated as separate
items. If you want unambiguous results where the data to be added could
itself be an array, be sure to wrap item supplied in your argument within
an array.

Note also when `add` is provided with objects containing a property `item`
(and optionally a `key` property), the value of `item` will be treated as the
record to be added, while any `key` will be used as the key. To supply
unambiguous items (where you are not sure whether `item` may exist on the
record to be added), you may wish to consistently wrap your items within an
object with an `item` property even if you are not supplying a `key`.

#### Updating

```js
server.people.update({
    firstName: 'Aaron',
    lastName: 'Powell',
    answer: 42
}).then(function (item) {
    // item added or updated
});
```

As with `add`, `update` shares the same behaviors as far as flattening of
the top level of array arguments and checking of `item`/`key` properties,
so if you need unambiguous results, please see the discussion above.

Using `update` will cause a record to be added if it does not yet exist.

`put` is also available as an alias of `update`.

#### Removing

```js
server.people.remove(1).then(function (key) {
    // item removed
});
```

`delete` is also available as an alias of `remove`.

##### Clearing

This allows removing all items in a table/collection:

```js
server.people.clear()
    .then(function() {
        // all table data is gone.
    });
```

### Fetching

#### Getting a single object by key

```js
server.people.get(5)
    .then(function (results) {
        // do something with the results
    });
```

#### Getting a single object by key range

If more than one match, it will retrieve the first.

With a MongoDB-style range:

```js
server.people.get({gte: 1, lt: 3})
    .then(function (results) {
        // do something with the results
    });
```

With an `IDBKeyRange`:

```js
server.people.get(IDBKeyRange.bound(1, 3, false, true))
    .then(function (results) {
        // do something with the results
    });
```

#### Querying

Queries require one or more methods to determine the type of querying
(all items, filtering, applying ranges, limits, distinct values, or
custom mapping--some of which can be combined
with some of the others), any methods for cursor direction, and then a
subsequent call to `execute()` (followed by a `then` or `catch`).

##### Querying all objects

```js
server.people.query()
    .all()
    .execute()
    .then(function (results) {
        // do something with the results
    });
```

##### Querying using indexes

```js
server.people.query('specialProperty')
    .all()
    .execute()
    .then(function (results) {
        // do something with the results (items which possess `specialProperty`)
    });
```

##### Querying with filtering

Note that unlike the other methods after a query, `filter` can
be executed multiple times.

###### Filter with property and value

```js
server.people.query()
    .filter('firstName', 'Aaron')
    .execute()
    .then(function (results) {
        // do something with the results
    });
```

###### Filter with function

```js
server.people.query()
    .filter(function(person) {return person.group === 'hipster';})
    .execute()
    .then(function (results) {
        // do something with the results
    });
```

##### Querying for distinct values

Will return only one record:

```js
server.people
    .query('firstName')
    .only('Aaron')
    .distinct()
    .execute()
    .then(function (data) {
        //
    });
```

##### Querying with ranges/keys

All ranges supported by `IDBKeyRange` can be used (`only`,
`bound`, `lowerBound`, `upperBound`).

```js
server.people.query('firstName')
    .only('Aaron')
    .then(function (results) {
        // do something with the results
    });

server.people.query('answer')
    .bound(30, 50)
    .then(function (results) {
        // do something with the results
    });
```

MongoDB-style ranges (as implemented in
[idb-range](https://github.com/treojs/idb-range)-driven libraries)
are also supported:

```js
server.people.query('firstName')
    .range({eq: 'Aaron'})
    .then(function (results) {
        // do something with the results
    });

server.people.query('answer')
    .range({gte: 30, lte: 50})
    .then(function (results) {
        // do something with the results
    });
```

Note that IndexedDB allows you to use array keys within ranges (and
other methods where a key is accepted) as long as you have created
your store with an array `keyPath` (and optionally with an index
`keyPath`).

```js
// The definition:
schema: {
    people: {
        key: {
            keyPath: ['lastName', 'firstName']
        },
        indexes: {
            name: {
                keyPath: ['lastName', 'firstName']
            },
            lastName: {},
            firstName: {}
        }
    }
}

// ...elsewhere to add the data...
s.people.add({lastName: 'Zamir', firstName: 'Brett'});

// Then later, the query:
s.people.query('name')
    .only(['Zamir', 'Brett'])
    .execute()
    .then(function (results) {
        // do something with the results
    });
```

Nested (dot-separated) key paths (with optional index)
may also be queried:

```js
// The definition:
schema: {
    people: {
        key: {
            keyPath: 'person.name.lastName'
        },
        indexes: {
            personName: {
                keyPath: 'person.name.lastName'
            }
        }
    }
}

// ...elsewhere to add the data...
s.people.add({person: {name: {lastName: 'Zamir', firstName: 'Brett'}}});

// Then later, the query:
s.people.query('personName')
    .only('Zamir')
    .execute()
    .then(function (results) {
        // do something with the results
    });
```

##### Limiting cursor range

Unlike key ranges which filter by the range of present values,
one may define a cursor range to determine whether to
skip through a certain number of initial result items and
to select how many items (up to the amount available) should
be retrieved from that point in the navigation of the cursor.

```js
server.people
    .query('firstName')
    .all()
    .limit(1, 3)
    .execute()
    .then(function (data) {
        // Skips the first item and obtains the next 3 items (or less if there are fewer)
    });
```

#### Cursor direction (desc)

The `desc` method may be used to change cursor
direction to descending order:

```js
server.people.query()
    .all()
    .desc()
    .execute()
    .then(function (results) {
        // Array of results will be in descending order
    });
```

#### Retrieving special types of values

##### Keys

Keys may be retrieved with or without an index:

```js
server.people.query('firstName')
    .only('Aaron')
    .keys()
    .execute()
    .then(function (results) {
        // `results` will contain one 'Aaron' value for each
        //    item in the people store with that first name
    });
```

##### Mapping

The `map` method allows you to modify the object being returned
without correspondingly modifying the actual object stored:

```js
server.people
    .query('age')
    .lowerBound(30)
    .map(function (value) {
        return {
            fullName: value.firstName + ' ' + value.lastName,
            raw: value
        };
    })
    .execute()
    .then(function (data) {
        // An array of people objects containing `fullName` and `raw` properties
    });
```

##### Counting

To count while utilizing an index and/or the `query`-returned methods,
you can use the following:

```js
server.people.query('firstName')
    .only('Aaron')
    .count()
    .execute()
    .then(function (results) {
        // `results` will equal the total count of "Aaron"'s
    });
```

If you only need a count of items in a store with only a key or range,
you can utilize `server.count`:

```js
// With no arguments (count all items)
server.people.count().then(function (ct) {
    // Do something with "ct"
});

// With a key
server.people.count(myKey).then(function (ct) {
    // Do something with "ct"
});

// With a MongoDB-style range
server.people.count({gte: 1, lt: 3}).then(function (ct) {
    // Do something with "ct"
});

// With an IDBKeyRange range
server.people.count(IDBKeyRange.bound(1, 3, false, true)).then(function (ct) {
    // Do something with "ct"
});
```

#### Atomic updates

Any query that returns a range of results can also be set to modify the
returned records automatically. This is done by adding `.modify()` at
the end of the query (right before `.execute()`).

`modify` only runs updates on objects matched by the query, and still returns
the same results to the `Promise`'s `then()` method (however, the results will
have the modifications applied to them).

Examples:

```js
// grab all users modified in the last 10 seconds,
server.users.query('last_mod')
    .lowerBound(new Date().getTime() - 10000)
    .modify({last_mod: new Date.getTime()})
    .execute()
    .then(function(results) {
        // now we have a list of recently modified users
    });

// grab all changed records and atomically set them as unchanged
server.users.query('changed')
    .only(true)
    .modify({changed: false})
    .execute()
    .then(...)

// use a function to update the results. the function is passed the original
// (unmodified) record, which allows us to update the data based on the record
// itself.
server.profiles.query('name')
    .lowerBound('marcy')
    .modify({views: function(profile) { return profile.views + 1; }})
    .execute()
    .then(...)
```

`modify` changes will be seen by any `map` functions.

`modify` can be used after: `all`, `filter`, ranges (`range`, `only`,
`bound`, `upperBound`, and `lowerBound`), `desc`, `distinct`, `limit`,
and `map`.

## Other server methods

### Closing connection

```js
server.close();
```

### Retrieving the `indexedDB.open` result object in use

```js
var db = server.getIndexedDB();
var storeNames = db.objectStoreNames;
```

## Server event handlers

All of the following are optional.

```js
server.addEventListener('abort', function (e) {
    // Handle abort event
});
server.addEventListener('error', function (err) {
    // Handle any errors (check err.name)
});
server.addEventListener('versionchange', function (e) {
    // Be notified of version changes (can use e.oldVersion and e.newVersion)
});
```

All of the following shorter equivalent forms (which also work internally
via `addEventListener`) are optional and can be chained as desired.

```js
server.abort(function (e) {
    // Handle abort event
}).error(function (err) {
    // Handle any errors (check err.name)
}).versionchange(function (e) {
    // Be notified of version changes (can use e.oldVersion and e.newVersion)
});
```

See the IndexedDB spec for the [possible exceptions](http://www.w3.org/TR/IndexedDB/#exceptions).

## Deleting a database

```js
db.delete(dbName).then(function (ev) {
    // Should have been a successful database deletion
}, function (err) {
    // Error during database deletion
});
```

Note that, in line with the behavior of the `deleteDatabase` method of
IndexedDB, `delete` will not actually produce an error if one attempts
to delete a database which doesn't exist or even if a non-string is
supplied.

However, as with the `open` operation, a `delete` operation will
produce an error so long as there are already opened blocking connections
(i.e., those allowing for database modification) which are open elsewhere
in the browser. You can nevertheless recover as follows:

```js
db.delete(dbName).catch(function (err) {
    if (err.type === 'blocked') {
        oldConnection.close();
        return err.resume;
    }
    // Handle other errors here
    throw err;
}).then(function (ev) {
    // Should have been a successful database deletion
});
```

See the documentation on `open` for more on such recovery from blocking
connections.

`del` is also available as an alias of `delete`.

## Comparing two keys

Returns `1` if the first key is greater than the second, `-1` if the first
is less than the second, and `0` if the first is equal to the second.

```js
db.cmp(key1, key2).then(function (ret) {
    // Use `ret`
});
```

# Promise notes

db.js used the ES6 Promise spec to handle asynchronous operations.

All operations that are asynchronous will return an instance of the
ES6 Promise object that exposes a `then` method which will take up
to two callbacks, `onFulfilled` and `onRejected`. Please refer to
the ES6 Promise spec for more information.

As of version `0.7.0` db.js's Promise API is designed to work with
ES6 Promises, please polyfill it if you would like to use another promise
library.

# Contributor notes

- `npm install` to install all the dependencies

In browser:

- `npm run grunt test:local` to run the mocha server
- Open (`http://localhost:9999/tests`)[] to run the mocha tests

In Node.js:

- `npm test`

or to avoid Saucelabs if set up:

- `npm run grunt phantom`

or to also avoid PhantomJS:

- `npm run grunt dev`

# License

The MIT License

Copyright (c) 2012-2015 Aaron Powell, Brett Zamir
