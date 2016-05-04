/*
# Notes

1. Could use/adapt [jtlt](https://github.com/brettz9/jtlt/) for changing JSON data

# Possible to-dos

1. Support data within adapted JSON Merge Patch
1. Allow JSON Schema to be specified during import (and export): https://github.com/aaronpowell/db.js/issues/181
1. JSON format above database level to allow for deleting or moving/copying of whole databases
1. `copyFrom`/`moveFrom` for indexes
*/

self._babelPolyfill = false; // Need by Phantom in avoiding duplicate babel polyfill error
import IdbSchema from 'idb-schema';

const stringify = JSON.stringify;
const hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
const compareStringified = (a, b) => stringify(a) === stringify(b);

export default class IdbImport extends IdbSchema {
    constructor () {
        super();
    }
    _setup (schema, cb, mergePatch) {
        const isNUL = schema === '\0';
        if (!schema || typeof schema !== 'object' && !(mergePatch && isNUL)) {
            throw new Error('Bad schema object');
        }
        this.addEarlyCallback((e) => {
            const db = e.target.result;
            const transaction = e.target.transaction;
            if (mergePatch && isNUL) {
                this._deleteAllUnused(db, transaction, {}, true);
                return;
            }
            return cb(e, db, transaction);
        });
    }
    _deleteIndexes (transaction, storeName, exceptionIndexes) {
        const store = transaction.objectStore(storeName); // Shouldn't throw
        Array.from(store.indexNames).forEach((indexName) => {
            if (!exceptionIndexes || !hasOwn(exceptionIndexes, indexName)) {
                this.delIndex(indexName);
            }
        });
    }
    _deleteAllUnused (db, transaction, schema, clearUnusedStores, clearUnusedIndexes) {
        if (clearUnusedStores || clearUnusedIndexes) {
            Array.from(db.objectStoreNames).forEach((storeName) => {
                if (clearUnusedStores && !hasOwn(schema, storeName)) {
                    // Errors for which we are not concerned and why:
                    // `InvalidStateError` - We are in the upgrade transaction.
                    // `TransactionInactiveError` (as by the upgrade having already
                    //      completed or somehow aborting) - since we've just started and
                    //      should be without risk in this loop
                    // `NotFoundError` - since we are iterating the dynamically updated
                    //      `objectStoreNames`
                    // this._versions[version].dropStores.push({name: storeName});
                    // Avoid deleting if going to delete in a move/copy
                    if (!Object.keys(schema).some((key) => [schema[key].moveFrom, schema[key].copyFrom].includes(storeName))) {
                        this.delStore(storeName); // Shouldn't throw // Keep this and delete previous line if this PR is accepted: https://github.com/treojs/idb-schema/pull/14
                    }
                } else if (clearUnusedIndexes) {
                    this._deleteIndexes(transaction, storeName, schema[storeName].indexes);
                }
            });
        }
    }
    _createStoreIfNotSame (db, transaction, schema, storeName, mergePatch) {
        const newStore = schema[storeName];
        let store;
        let storeParams = {};
        function setCanonicalProps (storeProp) {
            let canonicalPropValue;
            if (hasOwn(newStore, 'key')) { // Support old approach of db.js
                canonicalPropValue = newStore.key[storeProp];
            } else if (hasOwn(newStore, storeProp)) {
                canonicalPropValue = newStore[storeProp];
            } else {
                canonicalPropValue = storeProp === 'keyPath' ? null : false;
            }
            if (mergePatch && typeof canonicalPropValue === 'string') {
                if (canonicalPropValue === '\0') {
                    canonicalPropValue = storeProp === 'keyPath' ? null : false;
                } else {
                    canonicalPropValue = canonicalPropValue.replace(/^\0/, ''); // Remove escape if present
                }
            }
            storeParams[storeProp] = canonicalPropValue;
        }
        const copyFrom = newStore.copyFrom;
        const moveFrom = newStore.moveFrom;
        try {
            ['keyPath', 'autoIncrement'].forEach(setCanonicalProps);
            if (!db.objectStoreNames.contains(storeName)) {
                throw new Error('goto catch to build store');
            }
            store = transaction.objectStore(storeName); // Shouldn't throw
            this.getStore(store);
            if (!['keyPath', 'autoIncrement'].every((storeProp) => {
                return compareStringified(storeParams[storeProp], store[storeProp]);
            })) {
                // Avoid deleting if going to delete in a move/copy
                if (!copyFrom && !moveFrom) this.delStore(storeName);
                throw new Error('goto catch to build store');
            }
        } catch (err) {
            if (err.message !== 'goto catch to build store') {
                throw err;
            }
            if (copyFrom) {
                this.copyStore(copyFrom, storeName, storeParams); // May throw
            } else if (moveFrom) {
                this.renameStore(moveFrom, storeName, storeParams); // May throw
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
                // `SyntaxError` - if an invalid `storeParams.keyPath` is supplied.
                // `InvalidAccessError` - if `storeParams.autoIncrement` is `true` and `storeParams.keyPath` is an
                //      empty string or any sequence (empty or otherwise).
                this.addStore(storeName, storeParams); // May throw
            }
        }
        return [store, newStore];
    }
    _createIndex (store, indexes, indexName, mergePatch) {
        let newIndex = indexes[indexName];
        let indexParams = {};
        function setCanonicalProps (indexProp) {
            let canonicalPropValue;
            if (hasOwn(newIndex, indexProp)) {
                canonicalPropValue = newIndex[indexProp];
            } else {
                canonicalPropValue = indexProp === 'keyPath' ? null : false;
            }
            if (mergePatch && typeof canonicalPropValue === 'string') {
                if (canonicalPropValue === '\0') {
                    canonicalPropValue = indexProp === 'keyPath' ? null : false;
                } else {
                    canonicalPropValue = canonicalPropValue.replace(/^\0/, ''); // Remove escape if present
                }
            }
            indexParams[indexProp] = canonicalPropValue;
        }
        try {
            ['keyPath', 'unique', 'multiEntry', 'locale'].forEach(setCanonicalProps);
            if (!store || !store.indexNames.contains(indexName)) {
                throw new Error('goto catch to build index');
            }
            const oldIndex = store.index(indexName);
            if (!['keyPath', 'unique', 'multiEntry', 'locale'].every((indexProp) => {
                return compareStringified(indexParams[indexProp], oldIndex[indexProp]);
            })) {
                this.delIndex(indexName);
                throw new Error('goto catch to build index');
            }
        } catch (err) {
            if (err.message !== 'goto catch to build index') {
                throw err;
            }
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
            this.addIndex(indexName, indexParams.keyPath !== null ? indexParams.keyPath : indexName, indexParams);
        }
    }
    createIdbSchemaPatchSchema (schema) {
        schema(this); // May throw
    }
    // Modified JSON Merge Patch type schemas: https://github.com/json-schema-org/json-schema-spec/issues/15#issuecomment-211142145
    createMergePatchSchema (schema) {
        this._setup(schema, (e, db, transaction) => {
            Object.keys(schema).forEach((storeName) => {
                const schemaObj = schema[storeName];
                const isNUL = schemaObj === '\0';
                if (isNUL) {
                    this.delStore(storeName);
                    return;
                }
                if (!schemaObj || typeof schemaObj !== 'object') {
                    throw new Error('Invalid merge patch schema object (type: ' + typeof schemaObj + '): ' + schemaObj);
                }
                const [store] = this._createStoreIfNotSame(db, transaction, schema, storeName, true);
                if (hasOwn(schemaObj, 'indexes')) {
                    const indexes = schemaObj.indexes;
                    const isNUL = indexes === '\0';
                    if (isNUL) {
                        this._deleteIndexes(transaction, storeName);
                        return;
                    }
                    if (!indexes || typeof indexes !== 'object') {
                        throw new Error('Invalid merge patch indexes object (type: ' + typeof indexes + '): ' + indexes);
                    }
                    Object.keys(indexes).forEach((indexName) => {
                        const indexObj = indexes[indexName];
                        const isNUL = indexObj === '\0';
                        if (isNUL) {
                            this.delIndex(indexName);
                            return;
                        }
                        if (!indexObj || typeof indexObj !== 'object') {
                            throw new Error('Invalid merge patch index object (type: ' + typeof indexObj + '): ' + indexObj);
                        }
                        this._createIndex(store, indexes, indexName, true);
                    });
                }
            });
        });
    }
    createWholePatchSchema (schema, clearUnusedStores = true, clearUnusedIndexes = true) {
        this._setup(schema, (e, db, transaction) => {
            this._deleteAllUnused(db, transaction, schema, clearUnusedStores, clearUnusedIndexes);

            Object.keys(schema).forEach((storeName) => {
                const [store, newStore] = this._createStoreIfNotSame(db, transaction, schema, storeName);
                const indexes = newStore.indexes;
                Object.keys(indexes || {}).forEach((indexName) => {
                    this._createIndex(store, indexes, indexName);
                });
            });
        });
    }
    createVersionedSchema (schemas, schemaType, clearUnusedStores, clearUnusedIndexes) {
        const createPatches = (schemaObj, schemaType) => {
            switch (schemaType) {
            case 'mixed': {
                schemaObj.forEach((mixedObj) => {
                    const schemaType = Object.keys(mixedObj)[0];
                    let schema = mixedObj[schemaType];
                    if (schemaType !== 'idb-schema' && schema === 'function') {
                        schema = schema(this); // May throw
                    }
                    // These could immediately throw with a bad version
                    switch (schemaType) {
                    case 'idb-schema': { // Function called above
                        this.createIdbSchemaPatchSchema(schema);
                        break;
                    }
                    case 'merge': {
                        this.createMergePatchSchema(schema);
                        break;
                    }
                    case 'whole': {
                        this.createWholePatchSchema(schema, clearUnusedStores, clearUnusedIndexes);
                        break;
                    }
                    case 'mixed': {
                        createPatches(schema, schemaType);
                        break;
                    }
                    default:
                        throw new Error('Unrecognized schema type');
                    }
                });
                break;
            }
            case 'merge': {
                this.createMergePatchSchema(schemaObj);
                break;
            }
            case 'idb-schema': {
                this.createIdbSchemaPatchSchema(schemaObj);
                break;
            }
            case 'whole': {
                this.createWholePatchSchema(schemaObj, clearUnusedStores, clearUnusedIndexes);
                break;
            }
            }
        };
        Object.keys(schemas || {}).sort().forEach((schemaVersion) => {
            const version = parseInt(schemaVersion, 10);
            let schemaObj = schemas[version];
            if (schemaType !== 'idb-schema' && typeof schemaObj === 'function') {
                schemaObj = schemaObj(this); // May throw
            }
            this.version(version);
            createPatches(schemaObj, schemaType, version);
        });
    }
}
