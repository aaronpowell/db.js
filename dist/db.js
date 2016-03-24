(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.db = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function (local) {
    'use strict';

    var IDBKeyRange = local.IDBKeyRange || local.webkitIDBKeyRange;
    var transactionModes = {
        readonly: 'readonly',
        readwrite: 'readwrite'
    };
    var hasOwn = Object.prototype.hasOwnProperty;
    var defaultMapper = function defaultMapper(x) {
        return x;
    };

    var indexedDB = local.indexedDB || local.webkitIndexedDB || local.mozIndexedDB || local.oIndexedDB || local.msIndexedDB || local.shimIndexedDB || function () {
        throw new Error('IndexedDB required');
    }();

    var dbCache = {};
    var serverEvents = ['abort', 'error', 'versionchange'];

    function mongoDBToKeyRangeArgs(opts) {
        var keys = Object.keys(opts).sort();
        if (keys.length === 1) {
            var key = keys[0];
            var val = opts[key];
            var name = void 0,
                inclusive = void 0;
            switch (key) {
                case 'eq':
                    name = 'only';break;
                case 'gt':
                    name = 'lowerBound';
                    inclusive = true;
                    break;
                case 'lt':
                    name = 'upperBound';
                    inclusive = true;
                    break;
                case 'gte':
                    name = 'lowerBound';break;
                case 'lte':
                    name = 'upperBound';break;
                default:
                    throw new TypeError('`' + key + '` is not valid key');
            }
            return [name, [val, inclusive]];
        }
        var x = opts[keys[0]];
        var y = opts[keys[1]];
        var pattern = keys.join('-');

        switch (pattern) {
            case 'gt-lt':case 'gt-lte':case 'gte-lt':case 'gte-lte':
                return ['bound', [x, y, keys[0] === 'gt', keys[1] === 'lt']];
            default:
                throw new TypeError('`' + pattern + '` are conflicted keys');
        }
    }
    function mongoifyKey(key) {
        if (key && (typeof key === 'undefined' ? 'undefined' : _typeof(key)) === 'object' && !(key instanceof IDBKeyRange)) {
            var _mongoDBToKeyRangeArg = mongoDBToKeyRangeArgs(key);

            var _mongoDBToKeyRangeArg2 = _slicedToArray(_mongoDBToKeyRangeArg, 2);

            var type = _mongoDBToKeyRangeArg2[0];
            var args = _mongoDBToKeyRangeArg2[1];

            return IDBKeyRange[type].apply(IDBKeyRange, _toConsumableArray(args));
        }
        return key;
    }

    var Server = function Server(db, name, noServerMethods, version) {
        var _this3 = this;

        var closed = false;

        this.getIndexedDB = function () {
            return db;
        };
        this.isClosed = function () {
            return closed;
        };

        this.add = function (table) {
            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
            }

            return new Promise(function (resolve, reject) {
                var _this = this;

                if (closed) {
                    reject('Database has been closed');
                    return;
                }

                var records = args.reduce(function (records, aip) {
                    return records.concat(aip);
                }, []);

                var transaction = db.transaction(table, transactionModes.readwrite);
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

                var store = transaction.objectStore(table);
                records.forEach(function (record) {
                    var req = void 0;
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

        this.update = function (table) {
            for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
            }

            return new Promise(function (resolve, reject) {
                var _this2 = this;

                if (closed) {
                    reject('Database has been closed');
                    return;
                }

                var transaction = db.transaction(table, transactionModes.readwrite);
                transaction.oncomplete = function () {
                    return resolve(records, _this2);
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
                transaction.onabort = function (e) {
                    return reject(e);
                };

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
                transaction.oncomplete = function () {
                    return resolve(key);
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
                transaction.onabort = function (e) {
                    return reject(e);
                };

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
                transaction.oncomplete = function () {
                    return resolve();
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
                transaction.onabort = function (e) {
                    return reject(e);
                };

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
                transaction.onerror = function (e) {
                    return reject(e);
                };
                transaction.onabort = function (e) {
                    return reject(e);
                };

                var store = transaction.objectStore(table);

                try {
                    key = mongoifyKey(key);
                } catch (e) {
                    reject(e);
                }
                var req = store.get(key);
                req.onsuccess = function (e) {
                    return resolve(e.target.result);
                };
            });
        };

        this.query = function (table, index) {
            var error = closed ? 'Database has been closed' : null;
            return new IndexQuery(table, db, index, error);
        };

        this.count = function (table, key) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject('Database has been closed');
                    return;
                }
                var transaction = db.transaction(table);
                transaction.onerror = function (e) {
                    return reject(e);
                };
                transaction.onabort = function (e) {
                    return reject(e);
                };

                var store = transaction.objectStore(table);
                try {
                    key = mongoifyKey(key);
                } catch (e) {
                    reject(e);
                }
                var req = key === undefined ? store.count() : store.count(key);
                req.onsuccess = function (e) {
                    return resolve(e.target.result);
                };
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

        var err = void 0;
        [].some.call(db.objectStoreNames, function (storeName) {
            if (_this3[storeName]) {
                err = new Error('The store name, "' + storeName + '", which you have attempted to load, conflicts with db.js method names."');
                _this3.close();
                return true;
            }
            _this3[storeName] = {};
            var keys = Object.keys(_this3);
            keys.filter(function (key) {
                return ![].concat(serverEvents, ['close', 'addEventListener', 'removeEventListener']).includes(key);
            }).map(function (key) {
                return _this3[storeName][key] = function () {
                    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                        args[_key3] = arguments[_key3];
                    }

                    return _this3[key].apply(_this3, [storeName].concat(args));
                };
            });
        });
        return err;
    };

    var IndexQuery = function IndexQuery(table, db, indexName, preexistingError) {
        var _this4 = this;

        var modifyObj = false;

        var runQuery = function runQuery(type, args, cursorType, direction, limitRange, filters, mapper) {
            return new Promise(function (resolve, reject) {
                var keyRange = void 0;
                try {
                    keyRange = type ? IDBKeyRange[type].apply(IDBKeyRange, _toConsumableArray(args)) : null;
                } catch (e) {
                    reject(e);
                }
                var results = [];
                var indexArgs = [keyRange];
                var counter = 0;

                var transaction = db.transaction(table, modifyObj ? transactionModes.readwrite : transactionModes.readonly);
                transaction.oncomplete = function () {
                    return resolve(results);
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
                transaction.onabort = function (e) {
                    return reject(e);
                };

                var store = transaction.objectStore(table);
                var index = indexName ? store.index(indexName) : store;

                limitRange = limitRange || null;
                filters = filters || [];
                if (cursorType !== 'count') {
                    indexArgs.push(direction || 'next');
                }

                // Create a function that will set in the modifyObj properties into
                // the passed record.
                var modifyKeys = modifyObj ? Object.keys(modifyObj) : [];

                var modifyRecord = function modifyRecord(record) {
                    modifyKeys.forEach(function (key) {
                        var val = modifyObj[key];
                        if (typeof val === 'function') {
                            val = val(record);
                        }
                        record[key] = val;
                    });
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
                            // Out of limit range... skip
                        } else {
                                (function () {
                                    var matchFilter = true;
                                    var result = 'value' in cursor ? cursor.value : cursor.key;

                                    filters.forEach(function (filter) {
                                        if (!filter || !filter.length) {
                                            // Invalid filter do nothing
                                        } else if (filter.length === 2) {
                                                matchFilter = matchFilter && result[filter[0]] === filter[1];
                                            } else {
                                                matchFilter = matchFilter && filter[0](result);
                                            }
                                    });

                                    if (matchFilter) {
                                        counter++;
                                        // If we're doing a modify, run it now
                                        if (modifyObj) {
                                            result = modifyRecord(result);
                                            cursor.update(result);
                                        }
                                        results.push(mapper(result));
                                    }
                                    cursor.continue();
                                })();
                            }
                    }
                };
            });
        };

        var Query = function Query(type, args, queuedError) {
            var direction = 'next';
            var cursorType = 'openCursor';
            var filters = [];
            var limitRange = null;
            var mapper = defaultMapper;
            var unique = false;
            var error = preexistingError || queuedError;

            var execute = function execute() {
                if (error) {
                    return Promise.reject(error);
                }
                return runQuery(type, args, cursorType, unique ? direction + 'unique' : direction, limitRange, filters, mapper);
            };

            var limit = function limit() {
                for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
                    args[_key4] = arguments[_key4];
                }

                limitRange = args.slice(0, 2);
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
            var filter = function filter() {
                for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
                    args[_key5] = arguments[_key5];
                }

                filters.push(args.slice(0, 2));

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
            var desc = function desc() {
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
            var distinct = function distinct() {
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
            var modify = function modify(update) {
                modifyObj = update;
                return {
                    execute: execute
                };
            };
            var map = function map(fn) {
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

        this.range = function (opts) {
            var error = void 0;
            var keyRange = [null, null];
            try {
                keyRange = mongoDBToKeyRangeArgs(opts);
            } catch (e) {
                error = e;
            }
            return Query.apply(undefined, _toConsumableArray(keyRange).concat([error]));
        };

        this.filter = function () {
            var query = Query(null, null);
            return query.filter.apply(query, arguments);
        };

        this.all = function () {
            return this.filter();
        };
    };

    var createSchema = function createSchema(e, schema, db, reject, server, version) {
        if (!schema || schema.length === 0) {
            return;
        }

        for (var i = 0; i < db.objectStoreNames.length; i++) {
            var name = db.objectStoreNames[i];
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

        Object.keys(schema).some(function (tableName) {
            var table = schema[tableName];
            var store = void 0;
            if (db.objectStoreNames.contains(tableName)) {
                store = e.currentTarget.transaction.objectStore(tableName);
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
                // `SyntaxError` - if an invalid key path is supplied.
                // `InvalidAccessError` - if `table.key.autoIncrement` is `true` and `table.key.keyPath` is an
                //      empty string or any sequence (empty or otherwise).
                try {
                    store = db.createObjectStore(tableName, table.key);
                } catch (err) {
                    db.close();
                    delete dbCache[server][version];
                    reject(err);
                    return true;
                }
            }

            Object.keys(table.indexes || {}).forEach(function (indexKey) {
                var index = table.indexes[indexKey];
                try {
                    store.index(indexKey);
                } catch (err) {
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
                    store.createIndex(indexKey, index.key || indexKey, index && (typeof index === 'undefined' ? 'undefined' : _typeof(index)) === 'object' ? index : {});
                }
            });
        });
    };

    var _open = function _open(e, server, noServerMethods, version) {
        var db = e.target.result;
        dbCache[server][version] = db;

        var s = new Server(db, server, noServerMethods, version);
        return s instanceof Error ? Promise.reject(s) : Promise.resolve(s);
    };

    var db = {
        version: '0.14.0',
        open: function open(options) {
            var server = options.server;
            var version = options.version || 1;
            var schema = options.schema;
            var noServerMethods = options.noServerMethods;

            if (!dbCache[server]) {
                dbCache[server] = {};
            }
            return new Promise(function (resolve, reject) {
                if (dbCache[server][version]) {
                    _open({
                        target: {
                            result: dbCache[server][version]
                        }
                    }, server, noServerMethods, version).then(resolve, reject);
                } else {
                    var _ret2 = function () {
                        if (typeof schema === 'function') {
                            try {
                                schema = schema();
                            } catch (e) {
                                reject(e);
                                return {
                                    v: void 0
                                };
                            }
                        }
                        var request = indexedDB.open(server, version);

                        request.onsuccess = function (e) {
                            return _open(e, server, noServerMethods, version).then(resolve, reject);
                        };
                        request.onupgradeneeded = function (e) {
                            return createSchema(e, schema, e.target.result, reject, server, version);
                        };
                        request.onerror = function (e) {
                            return reject(e);
                        };
                        request.onblocked = function (e) {
                            var resume = new Promise(function (res, rej) {
                                // We overwrite handlers rather than make a new
                                //   open() since the original request is still
                                //   open and its onsuccess will still fire if
                                //   the user unblocks by closing the blocking
                                //   connection
                                request.onsuccess = function (ev) {
                                    _open(ev, server, noServerMethods, version).then(res, rej);
                                };
                                request.onerror = function (e) {
                                    return rej(e);
                                };
                            });
                            e.resume = resume;
                            reject(e);
                        };
                    }();

                    if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
                }
            });
        },

        delete: function _delete(dbName) {
            return new Promise(function (resolve, reject) {
                var request = indexedDB.deleteDatabase(dbName); // Does not throw

                request.onsuccess = function (e) {
                    return resolve(e);
                };
                request.onerror = function (e) {
                    return reject(e);
                }; // No errors currently
                request.onblocked = function (e) {
                    var resume = new Promise(function (res, rej) {
                        // We overwrite handlers rather than make a new
                        //   delete() since the original request is still
                        //   open and its onsuccess will still fire if
                        //   the user unblocks by closing the blocking
                        //   connection
                        request.onsuccess = function (ev) {
                            // Attempt to workaround Firefox event version problem: https://bugzilla.mozilla.org/show_bug.cgi?id=1220279
                            if (!('newVersion' in ev)) {
                                ev.newVersion = e.newVersion;
                            }

                            if (!('oldVersion' in ev)) {
                                ev.oldVersion = e.oldVersion;
                            }

                            res(ev);
                        };
                        request.onerror = function (e) {
                            return rej(e);
                        };
                    });
                    e.resume = resume;
                    reject(e);
                };
            });
        },

        cmp: function cmp(param1, param2) {
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
        define(function () {
            return db;
        });
    } else {
        local.db = db;
    }
})(self);


},{}]},{},[1])(1)
});