(function (local) {
    'use strict';

    const IDBKeyRange = local.IDBKeyRange || local.webkitIDBKeyRange;
    const transactionModes = {
        readonly: 'readonly',
        readwrite: 'readwrite'
    };
    const hasOwn = Object.prototype.hasOwnProperty;
    const defaultMapper = x => x;

    let indexedDB = local.indexedDB || local.webkitIndexedDB ||
        local.mozIndexedDB || local.oIndexedDB || local.msIndexedDB ||
        local.shimIndexedDB || (function () {
            throw new Error('IndexedDB required');
        }());

    const dbCache = {};

    function mongoDBToKeyRangeArgs (opts) {
        var keys = Object.keys(opts).sort();
        if (keys.length === 1) {
            var key = keys[0];
            var val = opts[key];
            var name, inclusive;
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
        var x = opts[keys[0]];
        var y = opts[keys[1]];
        var pattern = keys.join('-');

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

    var Server = function (db, name, noServerMethods, version) {
        var closed = false;

        this.getIndexedDB = () => db;
        this.isClosed = () => closed;

        this.add = function (table, ...args) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject('Database has been closed');
                    return;
                }

                var records = args.reduce(function (records, aip) {
                    return records.concat(aip);
                }, []);

                var transaction = db.transaction(table, transactionModes.readwrite);
                transaction.oncomplete = () => resolve(records, this);
                transaction.onerror = e => {
                    // prevent Firefox from throwing a ConstraintError and aborting (hard)
                    // https://bugzilla.mozilla.org/show_bug.cgi?id=872873
                    e.preventDefault();
                    reject(e);
                };
                transaction.onabort = e => reject(e);

                var store = transaction.objectStore(table);
                records.forEach(function (record) {
                    var req;
                    if (record.item && record.key) {
                        var key = record.key;
                        record = record.item;
                        req = store.add(record, key);
                    } else {
                        req = store.add(record);
                    }

                    req.onsuccess = function (e) {
                        var target = e.target;
                        var keyPath = target.source.keyPath;
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
                    reject('Database has been closed');
                    return;
                }

                var transaction = db.transaction(table, transactionModes.readwrite);
                transaction.oncomplete = () => resolve(records, this);
                transaction.onerror = e => reject(e);
                transaction.onabort = e => reject(e);

                var store = transaction.objectStore(table);
                var records = args.reduce(function (records, aip) {
                    return records.concat(aip);
                }, []);
                records.forEach(function (record) {
                    if (record.item && record.key) {
                        var key = record.key;
                        record = record.item;
                        store.put(record, key);
                    } else {
                        store.put(record);
                    }
                });
            });
        };

        this.remove = function (table, key) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject('Database has been closed');
                    return;
                }
                var transaction = db.transaction(table, transactionModes.readwrite);
                transaction.oncomplete = () => resolve(key);
                transaction.onerror = e => reject(e);
                transaction.onabort = e => reject(e);

                var store = transaction.objectStore(table);
                store.delete(key);
            });
        };

        this.clear = function (table) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject('Database has been closed');
                    return;
                }
                var transaction = db.transaction(table, transactionModes.readwrite);
                transaction.oncomplete = () => resolve();
                transaction.onerror = e => reject(e);
                transaction.onabort = e => reject(e);

                var store = transaction.objectStore(table);
                store.clear();
            });
        };

        this.close = function () {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject('Database has been closed');
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
                    reject('Database has been closed');
                    return;
                }
                var transaction = db.transaction(table);
                transaction.onerror = e => reject(e);
                transaction.onabort = e => reject(e);

                var store = transaction.objectStore(table);

                try {
                    key = mongoifyKey(key);
                } catch (e) {
                    reject(e);
                }
                var req = store.get(key);
                req.onsuccess = e => resolve(e.target.result);
            });
        };

        this.query = function (table, index) {
            var error = closed ? 'Database has been closed' : null;
            return new IndexQuery(table, db, index, error);
        };

        this.count = function (table, key) {
            return new Promise((resolve, reject) => {
                if (closed) {
                    reject('Database has been closed');
                    return;
                }
                var transaction = db.transaction(table);
                transaction.onerror = e => reject(e);
                transaction.onabort = e => reject(e);

                var store = transaction.objectStore(table);
                try {
                    key = mongoifyKey(key);
                } catch (e) {
                    reject(e);
                }
                var req = key === undefined ? store.count() : store.count(key);
                req.onsuccess = e => resolve(e.target.result);
            });
        };

        ['abort', 'error', 'versionchange'].forEach(function (eventName) {
            var onHandler = 'on' + eventName;
            this[onHandler] = function (table, handler) {
                db[onHandler] = handler;
                if (this[table]) {
                    return this[table];
                }
                return this;
            };
        }, this);

        if (noServerMethods) {
            return;
        }

        var err;
        [].some.call(db.objectStoreNames, storeName => {
            if (this[storeName]) {
                err = new Error('The store name, "' + storeName + '", which you have attempted to load, conflicts with db.js method names."');
                this.close();
                return true;
            }
            this[storeName] = {};
            var keys = Object.keys(this);
            keys.filter(key => key !== 'close')
                .map(key =>
                    this[storeName][key] = (...args) => this[key](storeName, ...args)
                );
        });
        return err;
    };

    var IndexQuery = function (table, db, indexName, preexistingError) {
        var modifyObj = false;

        var runQuery = function (type, args, cursorType, direction, limitRange, filters, mapper) {
            return new Promise(function (resolve, reject) {
                var keyRange = type ? IDBKeyRange[type](...args) : null;
                var results = [];
                var indexArgs = [keyRange];
                var counter = 0;

                var transaction = db.transaction(table, modifyObj ? transactionModes.readwrite : transactionModes.readonly);
                transaction.oncomplete = () => resolve(results);
                transaction.onerror = e => reject(e);
                transaction.onabort = e => reject(e);

                var store = transaction.objectStore(table);
                var index = indexName ? store.index(indexName) : store;

                limitRange = limitRange || null;
                filters = filters || [];
                if (cursorType !== 'count') {
                    indexArgs.push(direction || 'next');
                }

                // create a function that will set in the modifyObj properties into
                // the passed record.
                var modifyKeys = modifyObj ? Object.keys(modifyObj) : [];

                var modifyRecord = function (record) {
                    modifyKeys.forEach(key => {
                        var val = modifyObj[key];
                        if (val instanceof Function) { val = val(record); }
                        record[key] = val;
                    });
                    return record;
                };

                index[cursorType](...indexArgs).onsuccess = function (e) {
                    var cursor = e.target.result;
                    if (typeof cursor === 'number') {
                        results = cursor;
                    } else if (cursor) {
                        if (limitRange !== null && limitRange[0] > counter) {
                            counter = limitRange[0];
                            cursor.advance(limitRange[0]);
                        } else if (limitRange !== null && counter >= (limitRange[0] + limitRange[1])) {
                            // out of limit range... skip
                        } else {
                            var matchFilter = true;
                            var result = 'value' in cursor ? cursor.value : cursor.key;

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
                                // if we're doing a modify, run it now
                                if (modifyObj) {
                                    result = modifyRecord(result);
                                    cursor.update(result);
                                }
                                results.push(mapper(result));
                            }
                            cursor.continue();
                        }
                    }
                };
            });
        };

        var Query = function (type, args, queuedError) {
            var direction = 'next';
            var cursorType = 'openCursor';
            var filters = [];
            var limitRange = null;
            var mapper = defaultMapper;
            var unique = false;
            var error = preexistingError || queuedError;

            var execute = function () {
                if (error) {
                    return Promise.reject(error);
                }
                return runQuery(type, args, cursorType, unique ? direction + 'unique' : direction, limitRange, filters, mapper);
            };

            var limit = function (...args) {
                limitRange = args.slice(0, 2);
                if (limitRange.length === 1) {
                    limitRange.unshift(0);
                }

                return {
                    execute: execute
                };
            };
            var count = function () {
                direction = null;
                cursorType = 'count';

                return {
                    execute: execute
                };
            };

            var filter, desc, distinct, modify, map;
            var keys = function () {
                cursorType = 'openKeyCursor';

                return {
                    desc,
                    execute,
                    filter,
                    distinct,
                    map
                };
            };
            filter = function (...args) {
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
            desc = function () {
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
            distinct = function () {
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
            modify = function (update) {
                modifyObj = update;
                return {
                    execute
                };
            };
            map = function (fn) {
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
            var error;
            var keyRange = [null, null];
            try {
                keyRange = mongoDBToKeyRangeArgs(opts);
            } catch (e) {
                error = e;
            }
            return Query(...keyRange, error);
        };

        this.filter = function (...args) {
            var query = Query(null, null);
            return query.filter(...args);
        };

        this.all = function () {
            return this.filter();
        };
    };

    var createSchema = function (e, schema, db) {
        if (typeof schema === 'function') {
            schema = schema();
        }

        if (!schema || schema.length === 0) {
            return;
        }

        for (var i = 0; i < db.objectStoreNames.length; i++) {
            var name = db.objectStoreNames[i];
            if (schema.hasOwnProperty(name) === false) {
                e.currentTarget.transaction.db.deleteObjectStore(name);
            }
        }

        var tableName;
        for (tableName in schema) {
            var table = schema[tableName];
            var store;
            if (!hasOwn.call(schema, tableName) || db.objectStoreNames.contains(tableName)) {
                store = e.currentTarget.transaction.objectStore(tableName);
            } else {
                store = db.createObjectStore(tableName, table.key);
            }

            var indexKey;
            for (indexKey in table.indexes) {
                var index = table.indexes[indexKey];
                try {
                    store.index(indexKey);
                } catch (err) {
                    store.createIndex(indexKey, index.key || indexKey, Object.keys(index).length ? index : { unique: false });
                }
            }
        }
    };

    var open = function (e, server, noServerMethods, version, schema) {
        var db = e.target.result;
        dbCache[server][version] = db;

        var s = new Server(db, server, noServerMethods, version);
        return s instanceof Error ? Promise.reject(s) : Promise.resolve(s);
    };

    var db = {
        version: '0.13.2',
        open: function (options) {
            var server = options.server;
            var version = options.version || 1;
            if (!dbCache[server]) {
                dbCache[server] = {};
            }
            return new Promise(function (resolve, reject) {
                if (dbCache[server][version]) {
                    open({
                        target: {
                            result: dbCache[server][version]
                        }
                    }, server, options.noServerMethods, version, options.schema)
                    .then(resolve, reject);
                } else {
                    let request = indexedDB.open(server, version);

                    request.onsuccess = e => open(e, server, options.noServerMethods, version, options.schema).then(resolve, reject);
                    request.onupgradeneeded = e => createSchema(e, options.schema, e.target.result);
                    request.onerror = e => reject(e);
                    request.onblocked = e => {
                        var resume = new Promise(function (res, rej) {
                            // We overwrite handlers rather than make a new
                            //   open() since the original request is still
                            //   open and its onsuccess will still fire if
                            //   the user unblocks by closing the blocking
                            //   connection
                            request.onsuccess = (ev) => {
                                open(ev, server, options.noServerMethods, version, options.schema)
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
                var request = indexedDB.deleteDatabase(dbName);

                request.onsuccess = e => resolve(e);
                request.onerror = e => reject(e);
                request.onblocked = e => {
                    var resume = new Promise(function (res, rej) {
                        // We overwrite handlers rather than make a new
                        //   delete() since the original request is still
                        //   open and its onsuccess will still fire if
                        //   the user unblocks by closing the blocking
                        //   connection
                        request.onsuccess = ev => {
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
            return indexedDB.cmp(param1, param2);
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
