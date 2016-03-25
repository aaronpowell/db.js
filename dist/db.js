(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.db = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _idbSchema = require('idb-schema');

var _idbSchema2 = _interopRequireDefault(_idbSchema);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
            };
        }, this);

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
                var keyRange = type ? IDBKeyRange[type].apply(IDBKeyRange, _toConsumableArray(args)) : null;
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

                // create a function that will set in the modifyObj properties into
                // the passed record.
                var modifyKeys = modifyObj ? Object.keys(modifyObj) : [];

                var modifyRecord = function modifyRecord(record) {
                    modifyKeys.forEach(function (key) {
                        var val = modifyObj[key];
                        if (val instanceof Function) {
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
            var error;
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

    var createSchema = function createSchema(e, schema, db) {
        if (!schema || schema.length === 0) {
            return;
        }

        for (var i = 0; i < db.objectStoreNames.length; i++) {
            var name = db.objectStoreNames[i];
            if (!schema.hasOwnProperty(name)) {
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
            var idbschema = void 0;

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
                    var _ret = function () {
                        if (options.schemaBuilder) {
                            idbschema = new _idbSchema2.default();
                            var idbschemaVersion = idbschema.version();
                            try {
                                options.schemaBuilder(idbschema);
                                if (options.version && idbschemaVersion < version) {
                                    throw new Error('Your highest schema building (IDBSchema) version must not be less than a designated version.');
                                }
                                if (!options.version && idbschemaVersion > version) {
                                    options.version = idbschemaVersion;
                                }
                            } catch (e) {
                                reject(e);
                                return {
                                    v: void 0
                                };
                            }
                        }
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
                        request.onupgradeneeded = idbschema ? idbschema.callback() : function (e) {
                            return createSchema(e, schema, e.target.result);
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

                    if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
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
        local.db = db;
    }
})(self);


},{"idb-schema":2}],2:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _objectValues = require('object-values');

var _objectValues2 = _interopRequireDefault(_objectValues);

var _isInteger = require('is-integer');

var _isInteger2 = _interopRequireDefault(_isInteger);

var _isPlainObj = require('is-plain-obj');

var _isPlainObj2 = _interopRequireDefault(_isPlainObj);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Maximum version value (unsigned long long)
 * http://www.w3.org/TR/IndexedDB/#events
 */

var MAX_VERSION = Math.pow(2, 32) - 1;

/**
 * Export `Schema`.
 */

var Schema = (function () {
  function Schema() {
    _classCallCheck(this, Schema);

    this._stores = {};
    this._current = {};
    this._versions = {};
    this.version(1);
  }

  /**
   * Get/Set new version.
   *
   * @param {Number} [version]
   * @return {Schema|Number}
   */

  _createClass(Schema, [{
    key: 'version',
    value: function version(_version) {
      if (!arguments.length) return this._current.version;
      if (!(0, _isInteger2.default)(_version) || _version < 1 || _version < this.version() || _version > MAX_VERSION) {
        throw new TypeError('invalid version');
      }

      this._current = { version: _version, store: null };
      this._versions[_version] = {
        stores: [], // db.createObjectStore
        dropStores: [], // db.deleteObjectStore
        indexes: [], // store.createIndex
        dropIndexes: [], // store.deleteIndex
        callbacks: [],
        version: _version };

      // version
      return this;
    }

    /**
     * Add store.
     *
     * @param {String} name
     * @param {Object} [opts] { key: null, increment: false }
     * @return {Schema}
     */

  }, {
    key: 'addStore',
    value: function addStore(name) {
      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (typeof name !== 'string' || !name) throw new TypeError('"name" is required');
      if (this._stores[name]) throw new TypeError('"' + name + '" store is already defined');

      var store = {
        name: name,
        indexes: {},
        keyPath: opts.key || opts.keyPath || null,
        autoIncrement: opts.increment || opts.autoIncrement || false
      };
      if (store.autoIncrement && !store.keyPath) {
        throw new TypeError('set keyPath in order to use autoIncrement');
      }

      this._stores[name] = store;
      this._versions[this.version()].stores.push(store);
      this._current.store = store;

      return this;
    }

    /**
     * Delete store.
     *
     * @param {String} name
     * @return {Schema}
     */

  }, {
    key: 'delStore',
    value: function delStore(name) {
      if (typeof name !== 'string' || !name) throw new TypeError('"name" is required');
      var store = this._stores[name];
      if (!store) throw new TypeError('"' + name + '" store is not defined');
      delete this._stores[name];
      this._versions[this.version()].dropStores.push(store);
      this._current.store = null;
      return this;
    }

    /**
     * Change current store.
     *
     * @param {String} name
     * @return {Schema}
     */

  }, {
    key: 'getStore',
    value: function getStore(name) {
      if (typeof name !== 'string' || !name) throw new TypeError('"name" is required');
      if (!this._stores[name]) throw new TypeError('"' + name + '" store is not defined');
      this._current.store = this._stores[name];
      return this;
    }

    /**
     * Add index.
     *
     * @param {String} name
     * @param {String|Array} field
     * @param {Object} [opts] { unique: false, multi: false }
     * @return {Schema}
     */

  }, {
    key: 'addIndex',
    value: function addIndex(name, field) {
      var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      if (typeof name !== 'string' || !name) throw new TypeError('"name" is required');
      if (typeof field !== 'string' && !Array.isArray(field)) {
        throw new TypeError('"field" is required');
      }
      var store = this._current.store;
      if (!store) throw new TypeError('set current store using "getStore" or "addStore"');
      if (store.indexes[name]) throw new TypeError('"' + name + '" index is already defined');

      var index = {
        name: name,
        field: field,
        storeName: store.name,
        multiEntry: opts.multi || opts.multiEntry || false,
        unique: opts.unique || false
      };
      store.indexes[name] = index;
      this._versions[this.version()].indexes.push(index);

      return this;
    }

    /**
     * Delete index.
     *
     * @param {String} name
     * @return {Schema}
     */

  }, {
    key: 'delIndex',
    value: function delIndex(name) {
      if (typeof name !== 'string' || !name) throw new TypeError('"name" is required');
      var index = this._current.store.indexes[name];
      if (!index) throw new TypeError('"' + name + '" index is not defined');
      delete this._current.store.indexes[name];
      this._versions[this.version()].dropIndexes.push(index);
      return this;
    }

    /**
     * Add a callback to be executed at the end of the `upgradeneeded` event.
     * Callback will be supplied the `upgradeneeded` event object.
     *
     * @param {Function} cb
     * @return {Schema}
     */

  }, {
    key: 'addCallback',
    value: function addCallback(cb) {
      this._versions[this.version()].callbacks.push(cb);
      return this;
    }

    /**
     * Generate onupgradeneeded callback.
     *
     * @return {Function}
     */

  }, {
    key: 'callback',
    value: function callback() {
      var versions = (0, _objectValues2.default)(_clone(this._versions)).sort(function (a, b) {
        return a.version - b.version;
      });
      return function onupgradeneeded(e) {
        var oldVersion = e.oldVersion > MAX_VERSION ? 0 : e.oldVersion; // Safari bug
        var db = e.target.result;
        var tr = e.target.transaction;

        versions.forEach(function (versionSchema) {
          if (oldVersion >= versionSchema.version) return;

          versionSchema.stores.forEach(function (s) {
            // Only pass the options that are explicitly specified to createObjectStore() otherwise IE/Edge
            // can throw an InvalidAccessError - see https://msdn.microsoft.com/en-us/library/hh772493(v=vs.85).aspx
            var opts = {};
            if (s.keyPath) opts.keyPath = s.keyPath;
            if (s.autoIncrement) opts.autoIncrement = s.autoIncrement;
            db.createObjectStore(s.name, opts);
          });

          versionSchema.dropStores.forEach(function (s) {
            db.deleteObjectStore(s.name);
          });

          versionSchema.indexes.forEach(function (i) {
            tr.objectStore(i.storeName).createIndex(i.name, i.field, {
              unique: i.unique,
              multiEntry: i.multiEntry
            });
          });

          versionSchema.dropIndexes.forEach(function (i) {
            tr.objectStore(i.storeName).deleteIndex(i.name);
          });

          versionSchema.callbacks.forEach(function (cb) {
            cb(e);
          });
        });
      };
    }

    /**
     * Get a description of the stores.
     * It creates a deep clone of `this._stores` object
     * and transform it to an array.
     *
     * @return {Array}
     */

  }, {
    key: 'stores',
    value: function stores() {
      return (0, _objectValues2.default)(_clone(this._stores)).map(function (store) {
        store.indexes = (0, _objectValues2.default)(store.indexes).map(function (index) {
          delete index.storeName;
          return index;
        });
        return store;
      });
    }

    /**
     * Clone `this` to new schema object.
     *
     * @return {Schema} - new object
     */

  }, {
    key: 'clone',
    value: function clone() {
      var _this = this;

      var schema = new Schema();
      Object.keys(this).forEach(function (key) {
        return schema[key] = _clone(_this[key]);
      });
      return schema;
    }
  }]);

  return Schema;
})();

/**
 * Clone `obj`.
 * https://github.com/component/clone/blob/master/index.js
 */

exports.default = Schema;
function _clone(obj) {
  if (Array.isArray(obj)) {
    return obj.map(function (val) {
      return _clone(val);
    });
  }
  if ((0, _isPlainObj2.default)(obj)) {
    return Object.keys(obj).reduce(function (copy, key) {
      copy[key] = _clone(obj[key]);
      return copy;
    }, {});
  }
  return obj;
}
module.exports = exports['default'];
},{"is-integer":4,"is-plain-obj":5,"object-values":7}],3:[function(require,module,exports){
'use strict';
var numberIsNan = require('number-is-nan');

module.exports = Number.isFinite || function (val) {
	return !(typeof val !== 'number' || numberIsNan(val) || val === Infinity || val === -Infinity);
};

},{"number-is-nan":6}],4:[function(require,module,exports){
// https://github.com/paulmillr/es6-shim
// http://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.isinteger
var isFinite = require("is-finite");
module.exports = Number.isInteger || function(val) {
  return typeof val === "number" &&
    isFinite(val) &&
    Math.floor(val) === val;
};

},{"is-finite":3}],5:[function(require,module,exports){
'use strict';
var toString = Object.prototype.toString;

module.exports = function (x) {
	var prototype;
	return toString.call(x) === '[object Object]' && (prototype = Object.getPrototypeOf(x), prototype === null || prototype === Object.getPrototypeOf({}));
};

},{}],6:[function(require,module,exports){
'use strict';
module.exports = Number.isNaN || function (x) {
	return x !== x;
};

},{}],7:[function(require,module,exports){
'use strict';
module.exports = function (obj) {
	var keys = Object.keys(obj);
	var ret = [];

	for (var i = 0; i < keys.length; i++) {
		ret.push(obj[keys[i]]);
	}

	return ret;
};

},{}]},{},[1])(1)
});