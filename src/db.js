(function (window) {
    'use strict';

    const IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange;
    const transactionModes = {
        readonly: 'readonly',
        readwrite: 'readwrite'
    };
    const hasOwn = Object.prototype.hasOwnProperty;
    const defaultMapper = x => x;

    let indexedDB = (function () {
        if (!indexedDB) {
            indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB || window.shimIndexedDB;

            if (!indexedDB) {
                throw new Error('IndexedDB required');
            }
        }
        return indexedDB;
    })();

    let dbCache = {};
    var isArray = Array.isArray;

    var Server = function (db, name) {
        this.db = db;
        this.name = name;
        this.closed = false;

        [].map.call(db.objectStoreNames, storeName => {
            this[storeName] = {};
            var keys = Object.keys(Server.prototype);
            keys.filter(key => key !== 'close').forEach(key =>
                this[storeName][key] = this[key].bind(this, storeName)
            );
        });
    };

    Server.prototype.getIndexedDB = function () {
        return this.db;
    };

    Server.prototype.add = function (table, ...args) {
        if (this.closed) {
            throw new Error('Database has been closed');
        }

        var records = [];

        args.forEach(function (arg) {
            if (isArray(arg)) {
                records = records.concat(arg);
            } else {
                records.push(arg);
            }
        });

        var transaction = this.db.transaction(table, transactionModes.readwrite);
        var store = transaction.objectStore(table);

        return new Promise((resolve, reject) => {
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

            transaction.oncomplete = () => resolve(records, this);

            transaction.onerror = e => {
                // prevent Firefox from throwing a ConstraintError and aborting (hard)
                // https://bugzilla.mozilla.org/show_bug.cgi?id=872873
                e.preventDefault();
                reject(e);
            };
            transaction.onabort = e => reject(e);
        });
    };

    Server.prototype.update = function (table, ...args) {
        if (this.closed) {
            throw new Error('Database has been closed');
        }

        var transaction = this.db.transaction(table, transactionModes.readwrite);
        var store = transaction.objectStore(table);
        var records = [];

        args.forEach(function (arg) {
            if (isArray(arg)) {
                records = records.concat(arg);
            } else {
                records.push(arg);
            }
        });
        return new Promise((resolve, reject) => {
            records.forEach(function (record) {
                if (record.item && record.key) {
                    var key = record.key;
                    record = record.item;
                    store.put(record, key);
                } else {
                    store.put(record);
                }
            });

            transaction.oncomplete = () => resolve(records, this);
            transaction.onerror = e => reject(e);
            transaction.onabort = e => reject(e);
        });
    };

    Server.prototype.remove = function (table, key) {
        if (this.closed) {
            throw new Error('Database has been closed');
        }
        var transaction = this.db.transaction(table, transactionModes.readwrite);
        var store = transaction.objectStore(table);

        return new Promise(function (resolve, reject) {
            store.delete(key);
            transaction.oncomplete = () => resolve(key);
            transaction.onerror = e => reject(e);
        });
    };

    Server.prototype.clear = function (table) {
        if (this.closed) {
            throw new Error('Database has been closed');
        }
        var transaction = this.db.transaction(table, transactionModes.readwrite);
        var store = transaction.objectStore(table);

        store.clear();
        return new Promise(function (resolve, reject) {
            transaction.oncomplete = () => resolve();
            transaction.onerror = e => reject(e);
        });
    };

    Server.prototype.close = function () {
        if (this.closed) {
            throw new Error('Database has been closed');
        }
        this.db.close();
        this.closed = true;
        delete dbCache[this.name];
    };

    Server.prototype.get = function (table, id) {
        if (this.closed) {
            throw new Error('Database has been closed');
        }
        var transaction = this.db.transaction(table);
        var store = transaction.objectStore(table);

        var req = store.get(id);
        return new Promise(function (resolve, reject) {
            req.onsuccess = e => resolve(e.target.result);
            transaction.onerror = e => reject(e);
        });
    };

    Server.prototype.query = function (table, index) {
        if (this.closed) {
            throw new Error('Database has been closed');
        }
        return new IndexQuery(table, this.db, index);
    };

    Server.prototype.count = function (table/*, key*/) {
        if (this.closed) {
            throw new Error('Database has been closed');
        }
        var transaction = this.db.transaction(table);
        var store = transaction.objectStore(table);

        return new Promise((resolve, reject) => {
            var req = store.count();
            req.onsuccess = e => resolve(e.target.result);
            transaction.onerror = e => reject(e);
        });
    };

    var createReturnObject = function (thisObj, methods) {
        var retObj = {};
        methods.forEach(function (method) {
            retObj[method] = thisObj[method].bind(thisObj);
        });
        return retObj;
    };

    var Query = function (indexQueryObj, type, args) {
        this.direction = 'next';
        this.cursorType = 'openCursor';
        this.filters = [];
        this.limitRange = null;
        this.mapper = defaultMapper;
        this.unique = false;
        this.indexQueryObj = indexQueryObj;
        this.type = type;
        this.args = args;
    };
    Query.prototype.execute = function () {
        return this.indexQueryObj.runQuery(
            this.type,
            this.args,
            this.cursorType,
            this.unique ? this.direction + 'unique' : this.direction,
            this.limitRange,
            this.filters,
            this.mapper
        );
    };
    Query.prototype.limit = function () {
        this.limitRange = Array.prototype.slice.call(arguments, 0, 2);
        if (this.limitRange.length === 1) {
            this.limitRange.unshift(0);
        }
        return createReturnObject(this, ['execute']);
    };
    Query.prototype.count = function () {
        this.direction = null;
        this.cursorType = 'count';
        return createReturnObject(this, ['execute']);
    };
    Query.prototype.keys = function () {
        this.cursorType = 'openKeyCursor';
        return createReturnObject(this, ['desc', 'execute', 'filter', 'distinct', 'map']);
    };
    Query.prototype.filter = function () {
        this.filters.push(Array.prototype.slice.call(arguments, 0, 2));
        return createReturnObject(this, ['desc', 'execute', 'filter', 'distinct', 'map', 'keys', 'modify', 'limit']);
    };
    Query.prototype.desc = function () {
        this.direction = 'prev';
        return createReturnObject(this, ['execute', 'filter', 'distinct', 'map', 'keys', 'modify']);
    };
    Query.prototype.distinct = function () {
        this.unique = true;
        return createReturnObject(this, ['execute', 'filter', 'map', 'keys', 'modify', 'count', 'desc']);
    };
    Query.prototype.modify = function (update) {
        this.indexQueryObj.modifyObj = update;
        return createReturnObject(this, ['execute']);
    };
    Query.prototype.map = function (fn) {
        this.mapper = fn;
        return createReturnObject(this, ['desc', 'execute', 'filter', 'distinct', 'map', 'keys', 'modify', 'limit', 'count']);
    };

    var IndexQuery = function (table, db, indexName) {
        this.table = table;
        this.db = db;
        this.indexName = indexName;
        this.modifyObj = false;
    };

    IndexQuery.prototype.runQuery = function (type, args, cursorType, direction, limitRange, filters, mapper) {
        var transaction = this.db.transaction(this.table, this.modifyObj ? transactionModes.readwrite : transactionModes.readonly);
        var store = transaction.objectStore(this.table);
        var index = this.indexName ? store.index(this.indexName) : store;
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
        var modifyKeys = this.modifyObj ? Object.keys(this.modifyObj) : false;
        var modifyRecord = record => {
            for (var i = 0; i < modifyKeys.length; i++) {
                var key = modifyKeys[i];
                var val = this.modifyObj[key];
                if (val instanceof Function) { val = val(record); }
                record[key] = val;
            }
            return record;
        };

        index[cursorType].apply(index, indexArgs).onsuccess = e => {
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
                            matchFilter = matchFilter && filter[0].apply(undefined, [result]);
                        }
                    });

                    if (matchFilter) {
                        counter++;
                        results.push(mapper(result));
                        // if we're doing a modify, run it now
                        if (this.modifyObj) {
                            result = modifyRecord(result);
                            cursor.update(result);
                        }
                    }
                    cursor.continue();
                }
            }
        };

        return new Promise(function (resolve, reject) {
            transaction.oncomplete = () => resolve(results);
            transaction.onerror = e => reject(e);
            transaction.onabort = e => reject(e);
        });
    };

    ['only', 'bound', 'upperBound', 'lowerBound'].forEach(function (name) {
        IndexQuery.prototype[name] = function () {
            return new Query(this, name, arguments);
        };
    });

    IndexQuery.prototype.range = function (opts) {
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
            default: throw new TypeError('`' + key + '` is not a valid key');
            }
            return new Query(this, name, [val, inclusive]);
        }
        var x = opts[keys[0]];
        var y = opts[keys[1]];
        var pattern = keys.join('-');

        switch (pattern) {
        case 'gt-lt': case 'gt-lte': case 'gte-lt': case 'gte-lte':
            return new Query(this, 'bound', [x, y, keys[0] === 'gt', keys[1] === 'lt']);
        default: throw new TypeError(
          '`' + pattern + '` are conflicted keys'
        );
        }
    };

    IndexQuery.prototype.filter = function () {
        var query = new Query(this, null, null);
        return query.filter.apply(query, arguments);
    };

    IndexQuery.prototype.all = function () {
        return this.filter();
    };

    var createSchema = function (e, schema, db) {
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

    var open = function (e, server, version, schema) {
        var db = e.target.result;
        var s = new Server(db, server);

        dbCache[server] = db;

        return Promise.resolve(s);
    };

    var db = {
        version: '0.11.0',
        open: function (options) {
            return new Promise(function (resolve, reject) {
                if (dbCache[options.server]) {
                    open({
                        target: {
                            result: dbCache[options.server]
                        }
                    }, options.server, options.version, options.schema)
                    .then(resolve, reject);
                } else {
                    let request = indexedDB.open(options.server, options.version);

                    request.onsuccess = e => open(e, options.server, options.version, options.schema).then(resolve, reject);
                    request.onupgradeneeded = e => createSchema(e, options.schema, e.target.result);
                    request.onerror = e => reject(e);
                }
            });
        },

        delete: function (dbName) {
            return new Promise(function (resolve, reject) {
                var request = indexedDB.deleteDatabase(dbName);

                request.onsuccess = () => resolve();
                request.onerror = e => reject(e);
                request.onblocked = e => reject(e);
            });
        }
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = db;
    } else if (typeof define === 'function' && define.amd) {
        define(function () { return db; });
    } else {
        window.db = db;
    }
})(window);
