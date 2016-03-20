/*global guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';

    describe('db.indexes', function () {
        var indexedDB = window.indexedDB || window.webkitIndexedDB ||
            window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            this.dbName = guid();
            done();
        });

        afterEach(function (done) {
            if (this.server) { // No isClosed check as methods returns native result
                this.server.close();
            }
            this.server = undefined;

            var req = indexedDB.deleteDatabase(this.dbName);

            req.onsuccess = function () {
                done();
            };
            req.onerror = function () {
                console.log('failed to delete db', arguments);
            };
            req.onblocked = function () {
                console.log('db blocked', arguments);
            };
        });

        it('should allow creating dbs with indexes', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: 1,
                schema: {
                    test: {
                        key: {
                            keyPath: 'id',
                            autoIncrement: true
                        },
                        indexes: {
                            firstName: { },
                            age: { }
                        }
                    }
                }
            }).then(function (s) {
                spec.server = s;
            }).then(function () {
                spec.server.close();

                var req = indexedDB.open(spec.dbName, 1);
                req.onsuccess = function (e) {
                    var res = e.target.result;

                    var transaction = res.transaction('test');
                    var store = transaction.objectStore('test');
                    var indexNames = Array.prototype.slice.call(store.indexNames);

                    expect(indexNames.length).to.equal(2);
                    expect(indexNames).to.contain('firstName');
                    expect(indexNames).to.contain('age');

                    spec.server = res;
                    done();
                };
            });
        });

        it('should allow adding indexes to an existing object store', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: 1,
                schema: {
                    test: {
                        key: {
                            keyPath: 'id',
                            autoIncrement: true
                        }
                    }
                }
            }).then(function (s) {
                s.close();

                db.open({
                    server: spec.dbName,
                    version: 2,
                    schema: {
                        test: {
                            key: {
                                keyPath: 'id',
                                autoIncrement: true
                            },
                            indexes: {
                                firstName: { },
                                age: { }
                            }
                        }
                    }
                }).then(function (s) {
                    spec.server = s;
                }).then(function () {
                    spec.server.close();

                    var req = indexedDB.open(spec.dbName, 2);
                    req.onsuccess = function (e) {
                        var res = e.target.result;

                        var transaction = res.transaction('test');
                        var store = transaction.objectStore('test');
                        var indexNames = Array.prototype.slice.call(store.indexNames);

                        expect(indexNames.length).to.equal(2);
                        expect(indexNames).to.contain('firstName');
                        expect(indexNames).to.contain('age');

                        spec.server = res;
                        done();
                    };
                });
            });
        });

        it('should allow adding indexes to an existing object store with indexes', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: 1,
                schema: {
                    test: {
                        key: {
                            keyPath: 'id',
                            autoIncrement: true
                        },
                        indexes: {
                            firstName: {}
                        }
                    }
                }
            }).then(function (s) {
                s.close();

                db.open({
                    server: spec.dbName,
                    version: 2,
                    schema: {
                        test: {
                            key: {
                                keyPath: 'id',
                                autoIncrement: true
                            },
                            indexes: {
                                firstName: { },
                                age: { }
                            }
                        }
                    }
                }).then(function (s) {
                    spec.server = s;
                }).then(function () {
                    spec.server.close();

                    var req = indexedDB.open(spec.dbName, 2);
                    req.onsuccess = function (e) {
                        var res = e.target.result;

                        var transaction = res.transaction('test');
                        var store = transaction.objectStore('test');
                        var indexNames = Array.prototype.slice.call(store.indexNames);

                        expect(indexNames.length).to.equal(2);
                        expect(indexNames).to.contain('firstName');
                        expect(indexNames).to.contain('age');

                        spec.server = res;
                        done();
                    };
                });
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
