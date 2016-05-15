import IdbImport from './idb-import';
import batch, {transactionalBatch} from 'idb-batch';

(function (local) {
    'use strict';
    const hasOwn = Object.prototype.hasOwnProperty;

    const indexedDB = local.indexedDB || local.webkitIndexedDB ||
        local.mozIndexedDB || local.oIndexedDB || local.msIndexedDB ||
        local.shimIndexedDB || (function () {
            throw new Error('IndexedDB required');
        }());
    const IDBKeyRange = local.IDBKeyRange || local.webkitIDBKeyRange;

    const defaultMapper = x => x;
    const serverEvents = ['abort', 'error', 'versionchange'];
    const transactionModes = {
        readonly: 'readonly',
        readwrite: 'readwrite'
    };

    const dbCache = {};

    function isObject (item) {
        return item && typeof item === 'object';
    }

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
            default: throw new TypeError('`' + key + '` is not a valid key');
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
            const [type, args] = mongoDBToKeyRangeArgs(key);
            return IDBKeyRange[type](...args);
        }
        return key;
    }

    const IndexQuery = function (table, db, indexName, preexistingError, trans) {
        let modifyObj = null;

        const runQuery = function (type, args, cursorType, direction, limitRange, filters, mapper) {
            return new Promise(function (resolve, reject) {
                const keyRange = type ? IDBKeyRange[type](...args) : null; // May throw
                filters = filters || [];
                limitRange = limitRange || null;

                let results = [];
                let counter = 0;
                const indexArgs = [keyRange];

                const transaction = trans || db.transaction(table, modifyObj ? transactionModes.readwrite : transactionModes.readonly);
                transaction.addEventListener('error', e => reject(e));
                transaction.addEventListener('abort', e => reject(e));
                transaction.addEventListener('complete', () => resolve(results));

                const store = transaction.objectStore(table); // if bad, db.transaction will reject first
                const index = typeof indexName === 'string' ? store.index(indexName) : store;

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

                index[cursorType](...indexArgs).onsuccess = function (e) { // indexArgs are already validated
                    const cursor = e.target.result;
                    if (typeof cursor === 'number') {
                        results = cursor;
                    } else if (cursor) {
                        if (limitRange !== null && limitRange[0] > counter) {
                            counter = limitRange[0];
                            cursor.advance(limitRange[0]); // Will throw on 0, but condition above prevents since counter always 0+
                        } else if (limitRange !== null && counter >= (limitRange[0] + limitRange[1])) {
                            // Out of limit range... skip
                        } else {
                            let matchFilter = true;
                            let result = 'value' in cursor ? cursor.value : cursor.key;

                            try { // We must manually catch for this promise as we are within an async event function
                                filters.forEach(function (filter) {
                                    let propObj = filter[0];
                                    if (typeof propObj === 'function') {
                                        matchFilter = matchFilter && propObj(result); // May throw with filter on non-object
                                    } else {
                                        if (!propObj || typeof propObj !== 'object') {
                                            propObj = {[propObj]: filter[1]};
                                        }
                                        Object.keys(propObj).forEach((prop) => {
                                            matchFilter = matchFilter && (result[prop] === propObj[prop]); // May throw with error in filter function
                                        });
                                    }
                                });

                                if (matchFilter) {
                                    counter++;
                                    // If we're doing a modify, run it now
                                    if (modifyObj) {
                                        result = modifyRecord(result);  // May throw
                                        cursor.update(result); // May throw as `result` should only be a "structured clone"-able object
                                    }
                                    results.push(mapper(result)); // May throw
                                }
                            } catch (err) {
                                reject(err);
                                return;
                            }
                            cursor.continue();
                        }
                    }
                };
            });
        };

        const Query = function (type, args, queuedError) {
            const filters = [];
            let direction = 'next';
            let cursorType = 'openCursor';
            let limitRange = null;
            let mapper = defaultMapper;
            let unique = false;
            let error = preexistingError || queuedError;

            const execute = function () {
                if (error) {
                    return Promise.reject(error);
                }
                return runQuery(type, args, cursorType, unique ? direction + 'unique' : direction, limitRange, filters, mapper);
            };

            const count = function () {
                direction = null;
                cursorType = 'count';
                return {execute};
            };

            const keys = function () {
                cursorType = 'openKeyCursor';
                return {desc, distinct, execute, filter, limit, map};
            };

            const limit = function (start, end) {
                limitRange = !end ? [0, start] : [start, end];
                error = limitRange.some(val => typeof val !== 'number') ? new Error('limit() arguments must be numeric') : error;
                return {desc, distinct, filter, keys, execute, map, modify};
            };

            const filter = function (prop, val) {
                filters.push([prop, val]);
                return {desc, distinct, execute, filter, keys, limit, map, modify};
            };

            const desc = function () {
                direction = 'prev';
                return {distinct, execute, filter, keys, limit, map, modify};
            };

            const distinct = function () {
                unique = true;
                return {count, desc, execute, filter, keys, limit, map, modify};
            };

            const modify = function (update) {
                modifyObj = update && typeof update === 'object' ? update : null;
                return {execute};
            };

            const map = function (fn) {
                mapper = fn;
                return {count, desc, distinct, execute, filter, keys, limit, modify};
            };

            return {count, desc, distinct, execute, filter, keys, limit, map, modify};
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

    const Server = function (db, name, version, noServerMethods) {
        let closed = false;
        let trans;
        const setupTransactionAndStore = (db, table, records, resolve, reject, readonly) => {
            const transaction = trans || db.transaction(table, readonly ? transactionModes.readonly : transactionModes.readwrite);
            transaction.addEventListener('error', e => {
                // prevent throwing aborting (hard)
                // https://bugzilla.mozilla.org/show_bug.cgi?id=872873
                e.preventDefault();
                reject(e);
            });
            transaction.addEventListener('abort', e => reject(e));
            transaction.addEventListener('complete', () => resolve(records));
            return transaction.objectStore(table);
        };
        const adapterCb = (tr, cb) => {
            if (!trans) trans = tr;
            return cb(tr, this);
        };

        this.getIndexedDB = () => db;
        this.isClosed = () => closed;

        this.batch = function (storeOpsArr, opts = {extraStores: [], parallel: false}) {
            opts = opts || {};
            var {extraStores, parallel} = opts; // We avoid `resolveEarly`
            return transactionalBatch(db, storeOpsArr, {adapterCb, extraStores, parallel}).then((res) => {
                trans = undefined;
                return res;
            });
        };
        this.tableBatch = function (table, ops, opts = {parallel: false}) {
            opts = opts || {};
            return batch(db, table, ops, {adapterCb, parallel: opts.parallel}).then((res) => {
                trans = undefined;
                return res;
            });
        };

        this.query = function (table, index) {
            const error = closed ? new Error('Database has been closed') : null;
            return new IndexQuery(table, db, index, error, trans); // Does not throw by itself
        };

        this.add = function (table, ...args) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject(new Error('Database has been closed'));
                    return;
                }

                const records = args.reduce(function (records, aip) {
                    return records.concat(aip);
                }, []);

                const store = setupTransactionAndStore(db, table, records, resolve, reject);

                records.some(function (record) {
                    let req, key;
                    if (isObject(record) && hasOwn.call(record, 'item')) {
                        key = record.key;
                        record = record.item;
                        if (key != null) {
                            key = mongoifyKey(key); // May throw
                        }
                    }

                    // Safe to add since in readwrite, but may still throw
                    if (key != null) {
                        req = store.add(record, key);
                    } else {
                        req = store.add(record);
                    }

                    req.onsuccess = function (e) {
                        if (!isObject(record)) {
                            return;
                        }
                        const target = e.target;
                        let keyPath = target.source.keyPath;
                        if (keyPath === null) {
                            keyPath = '__id__';
                        }
                        if (hasOwn.call(record, keyPath)) {
                            return;
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

                const records = args.reduce(function (records, aip) {
                    return records.concat(aip);
                }, []);

                const store = setupTransactionAndStore(db, table, records, resolve, reject);

                records.some(function (record) {
                    let req, key;
                    if (isObject(record) && hasOwn.call(record, 'item')) {
                        key = record.key;
                        record = record.item;
                        if (key != null) {
                            key = mongoifyKey(key); // May throw
                        }
                    }
                    // These can throw DataError, e.g., if function passed in
                    if (key != null) {
                        req = store.put(record, key);
                    } else {
                        req = store.put(record);
                    }

                    req.onsuccess = function (e) {
                        if (!isObject(record)) {
                            return;
                        }
                        const target = e.target;
                        let keyPath = target.source.keyPath;
                        if (keyPath === null) {
                            keyPath = '__id__';
                        }
                        if (hasOwn.call(record, keyPath)) {
                            return;
                        }
                        Object.defineProperty(record, keyPath, {
                            value: target.result,
                            enumerable: true
                        });
                    };
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
                key = mongoifyKey(key); // May throw

                const store = setupTransactionAndStore(db, table, key, resolve, reject);

                store.delete(key); // May throw
            });
        };

        this.del = this.delete = function (...args) {
            return this.remove(...args);
        };

        this.clear = function (table) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject(new Error('Database has been closed'));
                    return;
                }
                const store = setupTransactionAndStore(db, table, undefined, resolve, reject);
                store.clear();
            });
        };

        this.close = function () {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject(new Error('Database has been closed'));
                    return;
                }
                closed = true;
                delete dbCache[name][version];
                db.close();
                resolve();
            });
        };

        this.get = function (table, key) {
            return new Promise(function (resolve, reject) {
                if (closed) {
                    reject(new Error('Database has been closed'));
                    return;
                }
                key = mongoifyKey(key); // May throw

                const store = setupTransactionAndStore(db, table, undefined, resolve, reject, true);

                const req = store.get(key);
                req.onsuccess = e => resolve(e.target.result);
            });
        };

        this.count = function (table, key) {
            return new Promise((resolve, reject) => {
                if (closed) {
                    reject(new Error('Database has been closed'));
                    return;
                }
                key = mongoifyKey(key); // May throw

                const store = setupTransactionAndStore(db, table, undefined, resolve, reject, true);

                const req = key == null ? store.count() : store.count(key); // May throw
                req.onsuccess = e => resolve(e.target.result);
            });
        };

        this.addEventListener = function (eventName, handler) {
            if (!serverEvents.includes(eventName)) {
                throw new Error('Unrecognized event type ' + eventName);
            }
            if (eventName === 'error') {
                db.addEventListener(eventName, function (e) {
                    e.preventDefault(); // Needed to prevent hard abort with ConstraintError
                    handler(e);
                });
                return;
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
        Array.from(db.objectStoreNames).some(storeName => {
            if (this[storeName]) {
                err = new Error('The store name, "' + storeName + '", which you have attempted to load, conflicts with db.js method names."');
                this.close();
                return true;
            }
            this[storeName] = {};
            const keys = Object.keys(this);
            keys.filter(key => !(([...serverEvents, 'close', 'batch', 'addEventListener', 'removeEventListener']).includes(key)))
                .map(key =>
                    this[storeName][key] = (...args) => this[key](storeName, ...args)
                );
        });
        return err;
    };

    const open = function (db, server, version, noServerMethods) {
        dbCache[server][version] = db;

        return new Server(db, server, version, noServerMethods);
    };

    const db = {
        version: '0.15.0',
        open: function (options) {
            const server = options.server;
            const noServerMethods = options.noServerMethods;
            const clearUnusedStores = options.clearUnusedStores !== false;
            const clearUnusedIndexes = options.clearUnusedIndexes !== false;
            let version = options.version || 1;
            let schema = options.schema;
            let schemas = options.schemas;
            let schemaType = options.schemaType || (schema ? 'whole' : 'mixed');
            if (!dbCache[server]) {
                dbCache[server] = {};
            }
            const openDb = function (db) {
                const s = open(db, server, version, noServerMethods);
                if (s instanceof Error) {
                    throw s;
                }
                return s;
            };

            return new Promise(function (resolve, reject) {
                if (dbCache[server][version]) {
                    const s = open(dbCache[server][version], server, version, noServerMethods);
                    if (s instanceof Error) {
                        reject(s);
                        return;
                    }
                    resolve(s);
                    return;
                }
                const idbimport = new IdbImport();
                let p = Promise.resolve();
                if (schema || schemas || options.schemaBuilder) {
                    const _addCallback = idbimport.addCallback;
                    idbimport.addCallback = function (cb) {
                        function newCb (db) {
                            const s = open(db, server, version, noServerMethods);
                            if (s instanceof Error) {
                                throw s;
                            }
                            return cb(db, s);
                        }
                        return _addCallback.call(idbimport, newCb);
                    };

                    p = p.then(() => {
                        if (options.schemaBuilder) {
                            return options.schemaBuilder(idbimport);
                        }
                    }).then(() => {
                        if (schema) {
                            switch (schemaType) {
                            case 'mixed': case 'idb-schema': case 'merge': case 'whole': {
                                schemas = {[version]: schema};
                                break;
                            }
                            }
                        }
                        if (schemas) {
                            idbimport.createVersionedSchema(schemas, schemaType, clearUnusedStores, clearUnusedIndexes);
                        }
                        const idbschemaVersion = idbimport.version();
                        if (options.version && idbschemaVersion < version) {
                            throw new Error(
                                'Your highest schema building (IDBSchema) version (' + idbschemaVersion + ') ' +
                                'must not be less than your designated version (' + version + ').'
                            );
                        }
                        if (!options.version && idbschemaVersion > version) {
                            version = idbschemaVersion;
                        }
                    });
                }

                p.then(() => {
                    return idbimport.open(server, version);
                }).catch((err) => {
                    if (err.resume) {
                        err.resume = err.resume.then(openDb);
                    }
                    if (err.retry) {
                        const _retry = err.retry;
                        err.retry = function () {
                            _retry.call(err).then(openDb);
                        };
                    }
                    throw err;
                }).then(openDb).then(resolve).catch((e) => {
                    reject(e);
                });
            });
        },

        del: function (dbName) {
            return this.delete(dbName);
        },
        delete: function (dbName) {
            return new Promise(function (resolve, reject) {
                const request = indexedDB.deleteDatabase(dbName); // Does not throw

                request.onsuccess = e => {
                    // The following is needed currently by PhantomJS (though we cannot polyfill `oldVersion`): https://github.com/ariya/phantomjs/issues/14141
                    if (!('newVersion' in e)) {
                        e.newVersion = null;
                    }
                    resolve(e);
                };
                request.onerror = e => { // No errors currently
                    e.preventDefault();
                    reject(e);
                };
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
                        request.onerror = e => {
                            e.preventDefault();
                            rej(e);
                        };
                    });
                    e.resume = resume;
                    reject(e);
                };
            });
        },

        cmp: function (param1, param2) {
            return new Promise(function (resolve, reject) {
                resolve(indexedDB.cmp(param1, param2)); // May throw
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
