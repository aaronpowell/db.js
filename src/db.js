(function (local) {
    'use strict';

    const IDBKeyRange = local.IDBKeyRange || local.webkitIDBKeyRange;
    const transactionModes = {
        readonly: 'readonly',
        readwrite: 'readwrite'
    };
    const hasOwn = Object.prototype.hasOwnProperty;
    const defaultMapper = x => x;

    const indexedDB = local.indexedDB || local.webkitIndexedDB ||
        local.mozIndexedDB || local.oIndexedDB || local.msIndexedDB ||
        local.shimIndexedDB || (function () {
            throw new Error('IndexedDB required');
        }());

    const dbCache = {};
    const serverEvents = ['abort', 'error', 'versionchange'];

    function mongoDBToKeyRangeArgs (opts) {
        const keys = Object.keys(opts).sort();
        if (keys.length === 1) {
            const key = keys[0];
            const val = opts[key];
            let name, inclusive;
            switch (key) {
            case 'eq': name = 'only'; break;
            case 'gt':
                name = 'lowerBound';
                inclusive = true;
                break;
            case 'lt':
                name = 'upperBound';
                inclusive = true;
                break;
            case 'gte': name = 'lowerBound'; break;
            case 'lte': name = 'upperBound'; break;
            default: throw new TypeError('`' + key + '` is not valid key');
            }
            return [name, [val, inclusive]];
        }
        const x = opts[keys[0]];
        const y = opts[keys[1]];
        const pattern = keys.join('-');

        switch (pattern) {
        case 'gt-lt': case 'gt-lte': case 'gte-lt': case 'gte-lte':
            return ['bound', [x, y, keys[0] === 'gt', keys[1] === 'lt']];
        default: throw new TypeError(
          '`' + pattern + '` are conflicted keys'
        );
        }
    }
    function mongoifyKey (key) {
        if (key && typeof key === 'object' && !(key instanceof IDBKeyRange)) {
            let [type, args] = mongoDBToKeyRangeArgs(key);
            return IDBKeyRange[type](...args);
        }
        return key;
    }

    const IndexQuery = function (table, db, indexName, preexistingError) {
        let modifyObj = null;

        const runQuery = function (type, args, cursorType, direction, limitRange, filters, mapper) {
            return new Promise(function (resolve, reject) {
                let keyRange;
                try {
                    keyRange = type ? IDBKeyRange[type](...args) : null;
                } catch (e) {
                    reject(e);
                    return;
                }
                let results = [];
                const indexArgs = [keyRange];
                let counter = 0;

                const transaction = db.transaction(table, modifyObj ? transactionModes.readwrite : transactionModes.readonly);
                transaction.oncomplete = () => resolve(results);
                transaction.onerror = e => reject(e);
                transaction.onabort = e => reject(e);

                const store = transaction.objectStore(table); // if bad, db.transaction will reject first
                const index = indexName ? store.index(indexName) : store;

                limitRange = limitRange || null;
                filters = filters || [];
                if (cursorType !== 'count') {
                    indexArgs.push(direction || 'next');
                }

                // Create a function that will set in the modifyObj properties into
                // the passed record.
                const modifyKeys = modifyObj ? Object.keys(modifyObj) : [];

                const modifyRecord = function (record) {
                    modifyKeys.forEach(key => {
                        let val = modifyObj[key];
                        if (typeof val === 'function') { val = val(record); }
                        record[key] = val;
                    });
                    return record;
                };

                index[cursorType](...indexArgs).onsuccess = function (e) {
                    const cursor = e.target.result;
                    if (typeof cursor === 'number') {
                        results = cursor;
                    } else if (cursor) {
                        if (limitRange !== null && limitRange[0] > counter) {
                            counter = limitRange[0];
                            cursor.advance(limitRange[0]);
                        } else if (limitRange !== null && counter >= (limitRange[0] + limitRange[1])) {
                            // Out of limit range... skip
                        } else {
                            let matchFilter = true;
                            let result = 'value' in cursor ? cursor.value : cursor.key;

                            filters.forEach(function (filter) {
                                if (!filter || !filter.length) {
                                    // Invalid filter do nothing
                                } else if (filter.length === 2) {
                                    matchFilter = matchFilter && (result[filter[0]] === filter[1]);
                                } else {
                                    matchFilter = matchFilter && filter[0](result);
                                }
                            });

                            if (matchFilter) {
                                counter++;
                                // If we're doing a modify, run it now
                                if (modifyObj) {
                                    try {
                                        result = modifyRecord(result);
                                    } catch (err) {
                                        reject(err);
                                        return;
                                    }
                                    cursor.update(result);
                                }
                                try {
                                    results.push(mapper(result));
                                } catch (err) {
                                    reject(err);
                                    return;
                                }
                            }
                            cursor.continue();
                        }
                    }
                };
            });
        };

        const Query = function (type, args, queuedError) {
            let direction = 'next';
            let cursorType = 'openCursor';
            const filters = [];
            let limitRange = null;
            let mapper = defaultMapper;
            let unique = false;
            const error = preexistingError || queuedError;

            const execute = function () {
                if (error) {
                    return Promise.reject(error);
                }
                return runQuery(type, args, cursorType, unique ? direction + 'unique' : direction, limitRange, filters, mapper);
            };

            const limit = function (...args) {
                limitRange = args.slice(0, 2);
                if (limitRange.length === 1) {
                    limitRange.unshift(0);
                }

                return {
                    execute
                };
            };
            const count = function () {
                direction = null;
                cursorType = 'count';

                return {
                    execute
                };
            };

            const keys = function () {
                cursorType = 'openKeyCursor';

                return {
                    desc,
                    execute,
                    filter,
                    distinct,
                    map
                };
            };
            const filter = function (...args) {
                filters.push(args.slice(0, 2));

                return {
                    keys,
                    execute,
                    filter,
                    desc,
                    distinct,
                    modify,
                    limit,
                    map
                };
            };
            const desc = function () {
                direction = 'prev';

                return {
                    keys,
                    execute,
                    filter,
                    distinct,
                    modify,
                    map
                };
            };
            const distinct = function () {
                unique = true;
                return {
                    keys,
                    count,
                    execute,
                    filter,
                    desc,
                    modify,
                    map
                };
            };
            const modify = function (update) {
                modifyObj = update && typeof update === 'object' ? update : null;
                return {
                    execute
                };
            };
            const map = function (fn) {
                mapper = fn;

                return {
                    execute,
                    count,
                    keys,
                    filter,
                    desc,
                    distinct,
                    modify,
                    limit,
                    map
                };
            };

            return {
                execute,
                count,
                keys,
                filter,
                desc,
                distinct,
                modify,
                limit,
                map
            };
        };

        ['only', 'bound', 'upperBound', 'lowerBound'].forEach((name) => {
            this[name] = function () {
                return Query(name, arguments);
            };
        });

        this.range = function (opts) {
            let error;
            let keyRange = [null, null];
            try {
                keyRange = mongoDBToKeyRangeArgs(opts);
            } catch (e) {
                error = e;
            }
            return Query(...keyRange, error);
        };

        this.filter = function (...args) {
            const query = Query(null, null);
            return query.filter(...args);
        };

        this.all = function () {
            return this.filter();
        };
    };

    const Server = function (db, name, noServerMethods, version) {
        let closed = false;

        this.getIndexedDB = () => db;
        this.isClosed = () => closed;

        this.add = function (table, ...args) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject(new Error('Database has been closed'));
                    return;
                }

                const records = args.reduce(function (records, aip) {
                    return records.concat(aip);
                }, []);

                const transaction = db.transaction(table, transactionModes.readwrite);
                transaction.oncomplete = () => resolve(records, this);
                transaction.onerror = e => {
                    // prevent Firefox from throwing a ConstraintError and aborting (hard)
                    // https://bugzilla.mozilla.org/show_bug.cgi?id=872873
                    e.preventDefault();
                    reject(e);
                };
                transaction.onabort = e => reject(e);

                const store = transaction.objectStore(table);
                records.forEach(function (record) {
                    let req;
                    if (record.item && record.key) {
                        const key = record.key;
                        record = record.item;
                        req = store.add(record, key);
                    } else {
                        req = store.add(record);
                    }

                    req.onsuccess = function (e) {
                        const target = e.target;
                        let keyPath = target.source.keyPath;
                        if (keyPath === null) {
                            keyPath = '__id__';
                        }
                        Object.defineProperty(record, keyPath, {
                            value: target.result,
                            enumerable: true
                        });
                    };
                });
            });
        };

        this.update = function (table, ...args) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject(new Error('Database has been closed'));
                    return;
                }

                const transaction = db.transaction(table, transactionModes.readwrite);
                transaction.oncomplete = () => resolve(records, this);
                transaction.onerror = e => reject(e);
                transaction.onabort = e => reject(e);

                const store = transaction.objectStore(table);
                const records = args.reduce(function (records, aip) {
                    return records.concat(aip);
                }, []);
                records.forEach(function (record) {
                    if (record.item && record.key) {
                        const key = record.key;
                        record = record.item;
                        store.put(record, key);
                    } else {
                        store.put(record);
                    }
                });
            });
        };

        this.put = function (...args) {
            return this.update(...args);
        };

        this.remove = function (table, key) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject(new Error('Database has been closed'));
                    return;
                }
                const transaction = db.transaction(table, transactionModes.readwrite);
                transaction.oncomplete = () => resolve(key);
                transaction.onerror = e => reject(e);
                transaction.onabort = e => reject(e);

                const store = transaction.objectStore(table);
                store.delete(key);
            });
        };

        this.delete = function (...args) {
            return this.remove(...args);
        };

        this.clear = function (table) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject(new Error('Database has been closed'));
                    return;
                }
                const transaction = db.transaction(table, transactionModes.readwrite);
                transaction.oncomplete = () => resolve();
                transaction.onerror = e => reject(e);
                transaction.onabort = e => reject(e);

                const store = transaction.objectStore(table);
                store.clear();
            });
        };

        this.close = function () {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject(new Error('Database has been closed'));
                }
                db.close();
                closed = true;
                delete dbCache[name][version];
                resolve();
            });
        };

        this.get = function (table, key) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject(new Error('Database has been closed'));
                    return;
                }
                const transaction = db.transaction(table);
                transaction.onerror = e => reject(e);
                transaction.onabort = e => reject(e);

                const store = transaction.objectStore(table);

                try {
                    key = mongoifyKey(key);
                } catch (e) {
                    reject(e);
                    return;
                }
                const req = store.get(key);
                req.onsuccess = e => resolve(e.target.result);
            });
        };

        this.query = function (table, index) {
            const error = closed ? new Error('Database has been closed') : null;
            return new IndexQuery(table, db, index, error); // Does not throw by itself
        };

        this.count = function (table, key) {
            return new Promise((resolve, reject) => {
                if (closed) {
                    reject(new Error('Database has been closed'));
                    return;
                }
                const transaction = db.transaction(table);
                transaction.onerror = e => reject(e);
                transaction.onabort = e => reject(e);

                const store = transaction.objectStore(table);
                try {
                    key = mongoifyKey(key);
                } catch (e) {
                    reject(e);
                    return;
                }
                const req = key === undefined ? store.count() : store.count(key);
                req.onsuccess = e => resolve(e.target.result);
            });
        };

        this.addEventListener = function (eventName, handler) {
            if (!serverEvents.includes(eventName)) {
                throw new Error('Unrecognized event type ' + eventName);
            }
            db.addEventListener(eventName, handler);
        };

        this.removeEventListener = function (eventName, handler) {
            if (!serverEvents.includes(eventName)) {
                throw new Error('Unrecognized event type ' + eventName);
            }
            db.removeEventListener(eventName, handler);
        };

        serverEvents.forEach(function (evName) {
            this[evName] = function (handler) {
                this.addEventListener(evName, handler);
                return this;
            };
        }, this);

        if (noServerMethods) {
            return;
        }

        let err;
        [].some.call(db.objectStoreNames, storeName => {
            if (this[storeName]) {
                err = new Error('The store name, "' + storeName + '", which you have attempted to load, conflicts with db.js method names."');
                this.close();
                return true;
            }
            this[storeName] = {};
            const keys = Object.keys(this);
            keys.filter(key => !(([...serverEvents, 'close', 'addEventListener', 'removeEventListener']).includes(key)))
                .map(key =>
                    this[storeName][key] = (...args) => this[key](storeName, ...args)
                );
        });
        return err;
    };

    const createSchema = function (e, schema, db, server, version) {
        if (!schema || schema.length === 0) {
            return;
        }

        for (let i = 0; i < db.objectStoreNames.length; i++) {
            const name = db.objectStoreNames[i];
            if (!hasOwn.call(schema, name)) {
                // Errors for which we are not concerned and why:
                // `InvalidStateError` - We are in the upgrade transaction.
                // `TransactionInactiveError` (as by the upgrade having already
                //      completed or somehow aborting) - since we've just started and
                //      should be without risk in this loop
                // `NotFoundError` - since we are iterating the dynamically updated
                //      `objectStoreNames`
                e.currentTarget.transaction.db.deleteObjectStore(name);
            }
        }

        let ret;
        Object.keys(schema).some(function (tableName) {
            const table = schema[tableName];
            let store;
            if (db.objectStoreNames.contains(tableName)) {
                store = e.currentTarget.transaction.objectStore(tableName); // Shouldn't throw
            } else {
                // Errors for which we are not concerned and why:
                // `InvalidStateError` - We are in the upgrade transaction.
                // `ConstraintError` - We are just starting (and probably never too large anyways) for a key generator.
                // `ConstraintError` - The above condition should prevent the name already existing.
                //
                // Possible errors:
                // `TransactionInactiveError` - if the upgrade had already aborted,
                //      e.g., from a previous `QuotaExceededError` which is supposed to nevertheless return
                //      the store but then abort the transaction.
                // `SyntaxError` - if an invalid `table.key.keyPath` is supplied.
                // `InvalidAccessError` - if `table.key.autoIncrement` is `true` and `table.key.keyPath` is an
                //      empty string or any sequence (empty or otherwise).
                try {
                    store = db.createObjectStore(tableName, table.key);
                } catch (err) {
                    // db.close();
                    // delete dbCache[server][version];
                    ret = err;
                    return true;
                }
            }

            Object.keys(table.indexes || {}).some(function (indexKey) {
                try {
                    store.index(indexKey);
                } catch (err) {
                    let index = table.indexes[indexKey];
                    index = index && typeof index === 'object' ? index : {};
                    // Errors for which we are not concerned and why:
                    // `InvalidStateError` - We are in the upgrade transaction and store found above should not have already been deleted.
                    // `ConstraintError` - We have already tried getting the index, so it shouldn't already exist
                    //
                    // Possible errors:
                    // `TransactionInactiveError` - if the upgrade had already aborted,
                    //      e.g., from a previous `QuotaExceededError` which is supposed to nevertheless return
                    //      the index object but then abort the transaction.
                    // `SyntaxError` - If the `keyPath` (second argument) is an invalid key path
                    // `InvalidAccessError` - If `multiEntry` on `index` is `true` and
                    //                          `keyPath` (second argument) is a sequence
                    try {
                        store.createIndex(indexKey, index.keyPath || index.key || indexKey, index);
                    } catch (err2) {
                        // db.close();
                        // delete dbCache[server][version];
                        ret = err2;
                        return true;
                    }
                }
            });
        });
        return ret;
    };

    const open = function (e, server, noServerMethods, version) {
        const db = e.target.result;
        dbCache[server][version] = db;

        const s = new Server(db, server, noServerMethods, version);
        return s instanceof Error ? Promise.reject(s) : Promise.resolve(s);
    };

    const db = {
        version: '0.14.0',
        open: function (options) {
            let server = options.server;
            let version = options.version || 1;
            let schema = options.schema;
            let noServerMethods = options.noServerMethods;

            if (!dbCache[server]) {
                dbCache[server] = {};
            }
            return new Promise(function (resolve, reject) {
                if (dbCache[server][version]) {
                    open({
                        target: {
                            result: dbCache[server][version]
                        }
                    }, server, noServerMethods, version)
                    .then(resolve, reject);
                } else {
                    if (typeof schema === 'function') {
                        try {
                            schema = schema();
                        } catch (e) {
                            reject(e);
                            return;
                        }
                    }
                    const request = indexedDB.open(server, version);

                    request.onsuccess = e => open(e, server, noServerMethods, version).then(resolve, reject);
                    request.onupgradeneeded = e => {
                        let err = createSchema(e, schema, e.target.result, server, version);
                        if (err) {
                            // Firefox throws `AbortError` errors when doing such operations as `close`
                            //   within `upgradeneeded`, so we have known errors execute instead in `onsuccess`;
                            //   see http://stackoverflow.com/questions/36225779/aborterror-within-indexeddb-upgradeneeded-event
                            request.onsuccess = e => {
                                reject(err);
                            };
                        }
                    };
                    request.onerror = e => {
                        e.preventDefault(); // For Firefox BadVersion errors; see https://bugzilla.mozilla.org/show_bug.cgi?id=872873
                        reject(e);
                    };
                    request.onblocked = e => {
                        const resume = new Promise(function (res, rej) {
                            // We overwrite handlers rather than make a new
                            //   open() since the original request is still
                            //   open and its onsuccess will still fire if
                            //   the user unblocks by closing the blocking
                            //   connection
                            request.onsuccess = (ev) => {
                                open(ev, server, noServerMethods, version)
                                    .then(res, rej);
                            };
                            request.onerror = e => rej(e);
                        });
                        e.resume = resume;
                        reject(e);
                    };
                }
            });
        },

        delete: function (dbName) {
            return new Promise(function (resolve, reject) {
                const request = indexedDB.deleteDatabase(dbName); // Does not throw

                request.onsuccess = e => resolve(e);
                request.onerror = e => reject(e); // No errors currently
                request.onblocked = e => {
                    // The following addresses part of https://bugzilla.mozilla.org/show_bug.cgi?id=1220279
                    e = e.newVersion === null || typeof Proxy === 'undefined' ? e : new Proxy(e, {get: function (target, name) {
                        return name === 'newVersion' ? null : target[name];
                    }});
                    const resume = new Promise(function (res, rej) {
                        // We overwrite handlers rather than make a new
                        //   delete() since the original request is still
                        //   open and its onsuccess will still fire if
                        //   the user unblocks by closing the blocking
                        //   connection
                        request.onsuccess = ev => {
                            // The following are needed currently by PhantomJS: https://github.com/ariya/phantomjs/issues/14141
                            if (!('newVersion' in ev)) {
                                ev.newVersion = e.newVersion;
                            }

                            if (!('oldVersion' in ev)) {
                                ev.oldVersion = e.oldVersion;
                            }

                            res(ev);
                        };
                        request.onerror = e => rej(e);
                    });
                    e.resume = resume;
                    reject(e);
                };
            });
        },

        cmp: function (param1, param2) {
            return new Promise(function (resolve, reject) {
                try {
                    resolve(indexedDB.cmp(param1, param2));
                } catch (e) {
                    reject(e);
                }
            });
        }
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = db;
    } else if (typeof define === 'function' && define.amd) {
        define(function () { return db; });
    } else {
        local.db = db;
    }
}(self));
