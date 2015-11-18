'use strict';

(function (window) {
    'use strict';

    var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange;
    var transactionModes = {
        readonly: 'readonly',
        readwrite: 'readwrite'
    };
    var hasOwn = Object.prototype.hasOwnProperty;
    var defaultMapper = function defaultMapper(x) {
        return x;
    };

    var indexedDB = (function () {
        if (!indexedDB) {
            indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB || (window.indexedDB === null && window.shimIndexedDB ? window.shimIndexedDB : undefined);

            if (!indexedDB) {
                throw new Error('IndexedDB required');
            }
        }
        return indexedDB;
    })();

    var dbCache = {};

    var Server = function Server(db, name) {
        var _this3 = this;

        var closed = false;

        this.getIndexedDB = function () {
            return db;
        };

        this.add = function (table) {
            if (closed) {
                throw new Error('Database has been closed');
            }

            var records = [];

            var isArray = Array.isArray;

            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
            }

            for (var i = 0, alm = args.length; i < alm; i++) {
                var aip = args[i];
                if (isArray(aip)) {
                    records = records.concat(aip);
                } else {
                    records.push(aip);
                }
            }

            var transaction = db.transaction(table, transactionModes.readwrite);
            var store = transaction.objectStore(table);

            return new Promise(function (resolve, reject) {
                var _this = this;

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

                transaction.oncomplete = function () {
                    return resolve(records, _this);
                };

                transaction.onerror = function (e) {
                    // prevent Firefox from throwing a ConstraintError and aborting (hard)
                    // https://bugzilla.mozilla.org/show_bug.cgi?id=872873
                    e.preventDefault();
                    reject(e);
                };
                transaction.onabort = function (e) {
                    return reject(e);
                };
            });
        };

        this.update = function (table) {
            for (var _len2 = arguments.length, records = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                records[_key2 - 1] = arguments[_key2];
            }

            if (closed) {
                throw new Error('Database has been closed');
            }

            var transaction = db.transaction(table, transactionModes.readwrite);
            var store = transaction.objectStore(table);

            return new Promise(function (resolve, reject) {
                var _this2 = this;

                records.forEach(function (record) {
                    if (record.item && record.key) {
                        var key = record.key;
                        record = record.item;
                        store.put(record, key);
                    } else {
                        store.put(record);
                    }
                });

                transaction.oncomplete = function () {
                    return resolve(records, _this2);
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
                transaction.onabort = function (e) {
                    return reject(e);
                };
            });
        };

        this.remove = function (table, key) {
            if (closed) {
                throw new Error('Database has been closed');
            }
            var transaction = db.transaction(table, transactionModes.readwrite);
            var store = transaction.objectStore(table);

            return new Promise(function (resolve, reject) {
                store.delete(key);
                transaction.oncomplete = function () {
                    return resolve(key);
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
            });
        };

        this.clear = function (table) {
            if (closed) {
                throw new Error('Database has been closed');
            }
            var transaction = db.transaction(table, transactionModes.readwrite);
            var store = transaction.objectStore(table);

            store.clear();
            return new Promise(function (resolve, reject) {
                transaction.oncomplete = function () {
                    return resolve();
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
            });
        };

        this.close = function () {
            if (closed) {
                throw new Error('Database has been closed');
            }
            db.close();
            closed = true;
            delete dbCache[name];
        };

        this.get = function (table, id) {
            if (closed) {
                throw new Error('Database has been closed');
            }
            var transaction = db.transaction(table);
            var store = transaction.objectStore(table);

            var req = store.get(id);
            return new Promise(function (resolve, reject) {
                req.onsuccess = function (e) {
                    return resolve(e.target.result);
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
            });
        };

        this.query = function (table, index) {
            if (closed) {
                throw new Error('Database has been closed');
            }
            return new IndexQuery(table, db, index);
        };

        this.count = function (table, key) {
            if (closed) {
                throw new Error('Database has been closed');
            }
            var transaction = db.transaction(table);
            var store = transaction.objectStore(table);

            return new Promise(function (resolve, reject) {
                var req = store.count();
                req.onsuccess = function (e) {
                    return resolve(e.target.result);
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
            });
        };

        [].map.call(db.objectStoreNames, function (storeName) {
            _this3[storeName] = {};
            var keys = Object.keys(_this3);
            keys.filter(function (key) {
                return key !== 'close';
            }).map(function (key) {
                return _this3[storeName][key] = function () {
                    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                        args[_key3] = arguments[_key3];
                    }

                    return _this3[key].apply(_this3, [storeName].concat(args));
                };
            });
        });
    };

    var IndexQuery = function IndexQuery(table, db, indexName) {
        var _this4 = this;

        var modifyObj = false;

        var runQuery = function runQuery(type, args, cursorType, direction, limitRange, filters, mapper) {
            var transaction = db.transaction(table, modifyObj ? transactionModes.readwrite : transactionModes.readonly);
            var store = transaction.objectStore(table);
            var index = indexName ? store.index(indexName) : store;
            var keyRange = type ? IDBKeyRange[type].apply(null, args) : null;
            var results = [];
            var indexArgs = [keyRange];
            var counter = 0;

            limitRange = limitRange || null;
            filters = filters || [];
            if (cursorType !== 'count') {
                indexArgs.push(direction || 'next');
            }

            // create a function that will set in the modifyObj properties into
            // the passed record.
            var modifyKeys = modifyObj ? Object.keys(modifyObj) : false;
            var modifyRecord = function modifyRecord(record) {
                for (var i = 0; i < modifyKeys.length; i++) {
                    var key = modifyKeys[i];
                    var val = modifyObj[key];
                    if (val instanceof Function) {
                        val = val(record);
                    }
                    record[key] = val;
                }
                return record;
            };

            index[cursorType].apply(index, indexArgs).onsuccess = function (e) {
                var cursor = e.target.result;
                if (typeof cursor === 'number') {
                    results = cursor;
                } else if (cursor) {
                    if (limitRange !== null && limitRange[0] > counter) {
                        counter = limitRange[0];
                        cursor.advance(limitRange[0]);
                    } else if (limitRange !== null && counter >= limitRange[0] + limitRange[1]) {
                        // out of limit range... skip
                    } else {
                            var matchFilter = true;
                            var result = 'value' in cursor ? cursor.value : cursor.key;

                            filters.forEach(function (filter) {
                                if (!filter || !filter.length) {
                                    // Invalid filter do nothing
                                } else if (filter.length === 2) {
                                        matchFilter = matchFilter && result[filter[0]] === filter[1];
                                    } else {
                                        matchFilter = matchFilter && filter[0].apply(undefined, [result]);
                                    }
                            });

                            if (matchFilter) {
                                counter++;
                                results.push(mapper(result));
                                // if we're doing a modify, run it now
                                if (modifyObj) {
                                    result = modifyRecord(result);
                                    cursor.update(result);
                                }
                            }
                            cursor.continue();
                        }
                }
            };

            return new Promise(function (resolve, reject) {
                transaction.oncomplete = function () {
                    return resolve(results);
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
                transaction.onabort = function (e) {
                    return reject(e);
                };
            });
        };

        var Query = function Query(type, args) {
            var direction = 'next';
            var cursorType = 'openCursor';
            var filters = [];
            var limitRange = null;
            var mapper = defaultMapper;
            var unique = false;

            var execute = function execute() {
                return runQuery(type, args, cursorType, unique ? direction + 'unique' : direction, limitRange, filters, mapper);
            };

            var limit = function limit() {
                limitRange = Array.prototype.slice.call(arguments, 0, 2);
                if (limitRange.length === 1) {
                    limitRange.unshift(0);
                }

                return {
                    execute: execute
                };
            };
            var count = function count() {
                direction = null;
                cursorType = 'count';

                return {
                    execute: execute
                };
            };

            var filter, desc, distinct, modify, map;
            var keys = function keys() {
                cursorType = 'openKeyCursor';

                return {
                    desc: desc,
                    execute: execute,
                    filter: filter,
                    distinct: distinct,
                    map: map
                };
            };
            filter = function () {
                filters.push(Array.prototype.slice.call(arguments, 0, 2));

                return {
                    keys: keys,
                    execute: execute,
                    filter: filter,
                    desc: desc,
                    distinct: distinct,
                    modify: modify,
                    limit: limit,
                    map: map
                };
            };
            desc = function () {
                direction = 'prev';

                return {
                    keys: keys,
                    execute: execute,
                    filter: filter,
                    distinct: distinct,
                    modify: modify,
                    map: map
                };
            };
            distinct = function () {
                unique = true;
                return {
                    keys: keys,
                    count: count,
                    execute: execute,
                    filter: filter,
                    desc: desc,
                    modify: modify,
                    map: map
                };
            };
            modify = function (update) {
                modifyObj = update;
                return {
                    execute: execute
                };
            };
            map = function (fn) {
                mapper = fn;

                return {
                    execute: execute,
                    count: count,
                    keys: keys,
                    filter: filter,
                    desc: desc,
                    distinct: distinct,
                    modify: modify,
                    limit: limit,
                    map: map
                };
            };

            return {
                execute: execute,
                count: count,
                keys: keys,
                filter: filter,
                desc: desc,
                distinct: distinct,
                modify: modify,
                limit: limit,
                map: map
            };
        };

        ['only', 'bound', 'upperBound', 'lowerBound'].forEach(function (name) {
            _this4[name] = function () {
                return Query(name, arguments);
            };
        });

        this.filter = function () {
            var query = Query(null, null);
            return query.filter.apply(query, arguments);
        };

        this.all = function () {
            return this.filter();
        };
    };

    var createSchema = function createSchema(e, schema, db) {
        if (typeof schema === 'function') {
            schema = schema();
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

    var _open = function _open(e, server, version, schema) {
        var db = e.target.result;
        var s = new Server(db, server);

        dbCache[server] = db;

        return Promise.resolve(s);
    };

    var db = {
        version: '0.11.0',
        open: function open(options) {
            return new Promise(function (resolve, reject) {
                if (dbCache[options.server]) {
                    _open({
                        target: {
                            result: dbCache[options.server]
                        }
                    }, options.server, options.version, options.schema).then(resolve, reject);
                } else {
                    var request = indexedDB.open(options.server, options.version);

                    request.onsuccess = function (e) {
                        return _open(e, options.server, options.version, options.schema).then(resolve, reject);
                    };
                    request.onupgradeneeded = function (e) {
                        return createSchema(e, options.schema, e.target.result);
                    };
                    request.onerror = function (e) {
                        return reject(e);
                    };
                }
            });
        },

        'delete': function _delete(dbName) {
            return new Promise(function (resolve, reject) {
                var request = indexedDB.deleteDatabase(dbName);

                request.onsuccess = function () {
                    return resolve();
                };
                request.onerror = function (e) {
                    return reject(e);
                };
                request.onblocked = function (e) {
                    return reject(e);
                };
            });
        }
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = db;
    } else if (typeof define === 'function' && define.amd) {
        define(function () {
            return db;
        });
    } else {
        window.db = db;
    }
})(window);
//# sourceMappingURL=db.js.map
