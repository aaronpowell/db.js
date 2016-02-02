'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

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

    var indexedDB = function () {
        if (!indexedDB) {
            indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB || window.shimIndexedDB;

            if (!indexedDB) {
                throw new Error('IndexedDB required');
            }
        }
        return indexedDB;
    }();

    var dbCache = {};
    var isArray = Array.isArray;

    function mongoDBToKeyRangeArgs(opts) {
        var keys = Object.keys(opts).sort();
        if (keys.length === 1) {
            var key = keys[0];
            var val = opts[key];
            var name, inclusive;
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

    var Server = function Server(db, name, noServerMethods) {
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

                var records = [];

                args.forEach(function (aip) {
                    if (isArray(aip)) {
                        records = records.concat(aip);
                    } else {
                        records.push(aip);
                    }
                });

                var transaction = db.transaction(table, transactionModes.readwrite);
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
                var store = transaction.objectStore(table);
                var records = [];

                args.forEach(function (aip) {
                    if (isArray(aip)) {
                        records = records.concat(aip);
                    } else {
                        records.push(aip);
                    }
                });
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
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject('Database has been closed');
                    return;
                }
                var transaction = db.transaction(table, transactionModes.readwrite);
                var store = transaction.objectStore(table);

                store.delete(key);
                transaction.oncomplete = function () {
                    return resolve(key);
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
                transaction.onabort = function (e) {
                    return reject(e);
                };
            });
        };

        this.clear = function (table) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject('Database has been closed');
                    return;
                }
                var transaction = db.transaction(table, transactionModes.readwrite);
                var store = transaction.objectStore(table);

                store.clear();
                transaction.oncomplete = function () {
                    return resolve();
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
                transaction.onabort = function (e) {
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

        this.get = function (table, key) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject('Database has been closed');
                    return;
                }
                var transaction = db.transaction(table);
                var store = transaction.objectStore(table);

                key = mongoifyKey(key);
                var req = store.get(key);
                req.onsuccess = function (e) {
                    return resolve(e.target.result);
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
                transaction.onabort = function (e) {
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
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject('Database has been closed');
                    return;
                }
                var transaction = db.transaction(table);
                var store = transaction.objectStore(table);
                key = mongoifyKey(key);
                var req = key === undefined ? store.count() : store.count(key);
                req.onsuccess = function (e) {
                    return resolve(e.target.result);
                };
                transaction.onerror = function (e) {
                    return reject(e);
                };
                transaction.onabort = function (e) {
                    return reject(e);
                };
            });
        };

        if (noServerMethods) {
            return;
        }

        var err;
        [].some.call(db.objectStoreNames, function (storeName) {
            if (_this3[storeName]) {
                err = new Error('The store name, "' + storeName + '", which you have attempted to load, conflicts with db.js method names."');
                _this3.close();
                return true;
            }
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
        return err;
    };

    var IndexQuery = function IndexQuery(table, db, indexName) {
        var _this4 = this;

        var modifyObj = false;

        var runQuery = function runQuery(type, args, cursorType, direction, limitRange, filters, mapper) {
            var transaction = db.transaction(table, modifyObj ? transactionModes.readwrite : transactionModes.readonly);
            var store = transaction.objectStore(table);
            var index = indexName ? store.index(indexName) : store;
            var keyRange = type ? IDBKeyRange[type].apply(IDBKeyRange, _toConsumableArray(args)) : null;
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

            var _filter, desc, distinct, modify, _map;
            var keys = function keys() {
                cursorType = 'openKeyCursor';

                return {
                    desc: desc,
                    execute: execute,
                    filter: _filter,
                    distinct: distinct,
                    map: _map
                };
            };
            _filter = function filter() {
                for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
                    args[_key5] = arguments[_key5];
                }

                filters.push(args.slice(0, 2));

                return {
                    keys: keys,
                    execute: execute,
                    filter: _filter,
                    desc: desc,
                    distinct: distinct,
                    modify: modify,
                    limit: limit,
                    map: _map
                };
            };
            desc = function desc() {
                direction = 'prev';

                return {
                    keys: keys,
                    execute: execute,
                    filter: _filter,
                    distinct: distinct,
                    modify: modify,
                    map: _map
                };
            };
            distinct = function distinct() {
                unique = true;
                return {
                    keys: keys,
                    count: count,
                    execute: execute,
                    filter: _filter,
                    desc: desc,
                    modify: modify,
                    map: _map
                };
            };
            modify = function modify(update) {
                modifyObj = update;
                return {
                    execute: execute
                };
            };
            _map = function map(fn) {
                mapper = fn;

                return {
                    execute: execute,
                    count: count,
                    keys: keys,
                    filter: _filter,
                    desc: desc,
                    distinct: distinct,
                    modify: modify,
                    limit: limit,
                    map: _map
                };
            };

            return {
                execute: execute,
                count: count,
                keys: keys,
                filter: _filter,
                desc: desc,
                distinct: distinct,
                modify: modify,
                limit: limit,
                map: _map
            };
        };

        ['only', 'bound', 'upperBound', 'lowerBound'].forEach(function (name) {
            _this4[name] = function () {
                return Query(name, arguments);
            };
        });

        this.range = function (opts) {
            return Query.apply(null, mongoDBToKeyRangeArgs(opts));
        };

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

        if (!schema || schema.length === 0) {
            return;
        }

        for (var objectStoreKey in db.objectStoreNames) {
            if (db.objectStoreNames.hasOwnProperty(objectStoreKey)) {
                var name = db.objectStoreNames[objectStoreKey];
                if (schema.hasOwnProperty(name) === false) {
                    e.currentTarget.transaction.db.deleteObjectStore(name);
                }
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

    var _open = function _open(e, server, noServerMethods, version, schema) {
        var db = e.target.result;
        dbCache[server] = db;

        var s = new Server(db, server, noServerMethods);
        return s instanceof Error ? Promise.reject(s) : Promise.resolve(s);
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
                    }, options.server, options.noServerMethods, options.version, options.schema).then(resolve, reject);
                } else {
                    var request = indexedDB.open(options.server, options.version);

                    request.onsuccess = function (e) {
                        return _open(e, options.server, options.noServerMethods, options.version, options.schema).then(resolve, reject);
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

        delete: function _delete(dbName) {
            return new Promise(function (resolve, reject) {
                var request = indexedDB.deleteDatabase(dbName);

                request.onsuccess = function (e) {
                    return resolve(e);
                };
                request.onerror = function (e) {
                    return reject(e);
                };
                request.onblocked = function (e) {
                    return reject(e);
                };
            });
        },

        cmp: function cmp(param1, param2) {
            return indexedDB.cmp(param1, param2);
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
