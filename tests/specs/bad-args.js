/*global window, guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    var key1, key2; // eslint-disable-line no-unused-vars
    describe('bad args', function () {
        var indexedDB = window.indexedDB || window.webkitIndexedDB ||
            window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            this.dbName = guid();

            var req = indexedDB.open(this.dbName);
            req.onupgradeneeded = function () {
                var objStore = req.result.createObjectStore('names', {autoIncrement: true});
                var person1 = {name: 'Alex'};
                var person2 = {name: 'Mia'};

                var addReq1 = objStore.add(person1);
                addReq1.onsuccess = function (e) {
                    key1 = e.target.result;
                    var addReq2 = objStore.add(person2);
                    addReq2.onsuccess = function (e2) {
                        key2 = e2.target.result;
                        req.result.close();
                        done();
                    };
                };
            };
            req.onblocked = function (e) {
                done(e);
            };
        });

        afterEach(function (done) {
            if (this.server && !this.server.isClosed()) {
                this.server.close();
            }
            this.server = undefined;

            var req = indexedDB.deleteDatabase(this.dbName);

            req.onsuccess = function () {
                done();
            };
            req.onerror = function (e) {
                console.log('failed to delete db', arguments);
            };
            req.onblocked = function (e) {
                console.log('db blocked', arguments);
            };
        });

        describe('open', function () {
            it('should catch bad schema arg', function (done) {
                db.open({server: this.dbName, schema: function () {
                    throw new Error('Bad schema');
                }}).catch(function (err) {
                    expect(err.message).to.equal('Bad schema');
                    done();
                });
            });
            it('should catch an attempt to (auto-load) a schema with a conflicting name (when there is no noServerMethods)', function (done) {
                var spec = this;
                var req = indexedDB.open(this.dbName, 2);
                req.onupgradeneeded = function () {
                    var storeNameConflictingWithMethod = 'count';
                    req.result.createObjectStore(storeNameConflictingWithMethod);
                    req.result.close();
                    db.open({server: spec.dbName, version: 2}).catch(function (err) {
                        expect(err.message).to.have.string('conflicts with db.js method names');
                        done();
                    });
                };
            });
        });

        describe('createSchema', function () {
            it('should catch bad key paths', function (done) {
                db.open({server: this.dbName, version: 2, schema: {
                    test: {
                        key: {
                            keyPath: 55
                        }
                    }
                }}).catch(function (err) {
                    expect(err.name).to.equal('SyntaxError');
                    done();
                });
            });
            it('should catch autoIncrement with empty key path string', function (done) {
                db.open({server: this.dbName, version: 2, schema: {
                    test: {
                        key: {
                            autoIncrement: true,
                            keyPath: ''
                        }
                    }
                }}).catch(function (err) {
                    expect(err.name).to.equal('InvalidAccessError');
                    done();
                });
            });
        });

        it('should catch bad args to delete', function (done) {
            var spec = this;
            db.open({server: this.dbName}).then(function (s) {
                db.delete(spec.dbName).catch(function (err) { // Other arguments (or missing arguments) do not throw
                    expect(err.type).to.equal('blocked');
                    s.close();
                    done();
                });
            });
        });

        it('should catch bad args to cmp', function (done) {
            db.cmp(key1, null).catch(function (err) {
                expect(err.name).to.equal('DataError');
                done();
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
