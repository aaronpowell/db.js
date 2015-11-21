(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';

    describe('db.indexes', function () {
        var dbName = 'tests';
        var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            var spec = this;

            spec.server = undefined;

            var req = indexedDB.deleteDatabase(dbName);

            req.onsuccess = function () {
                done();
            };

            req.onerror = function () {
                console.log('failed to delete db in beforeEach', arguments);
            };

            req.onblocked = function () {
                console.log('db blocked', arguments, spec);
            };
        });

        afterEach(function (done) {
            if (this.server) {
                this.server.close();
            }

            var spec = this;

            var req = indexedDB.deleteDatabase(dbName);

            req.onsuccess = function () {
                done();
            };

            req.onerror = function () {
                console.log('failed to delete db in afterEach', arguments, spec);
            };

            req.onblocked = function () {
                console.log('db blocked', arguments);
            };
        });

        it('should allow creating dbs with indexes', function (done) {
            var spec = this;
            db.open({
                server: dbName,
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

                var req = indexedDB.open(dbName, 1);
                req.onsuccess = function (e) {
                    var res = e.target.result;

                    var transaction = res.transaction('test');
                    var store = transaction.objectStore('test');
                    var indexNames = Array.prototype.slice.call(store.indexNames);

                    expect(indexNames.length).toEqual(2);
                    expect(indexNames).toContain('firstName');
                    expect(indexNames).toContain('age');

                    spec.server = res;
                    done();
                };
            });
        });

        it('should allow adding indexes to an existing object store', function (done) {
            var spec = this;
            db.open({
                server: dbName,
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
                    server: dbName,
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

                    var req = indexedDB.open(dbName, 2);
                    req.onsuccess = function (e) {
                        var res = e.target.result;

                        var transaction = res.transaction('test');
                        var store = transaction.objectStore('test');
                        var indexNames = Array.prototype.slice.call(store.indexNames);

                        expect(indexNames.length).toEqual(2);
                        expect(indexNames).toContain('firstName');
                        expect(indexNames).toContain('age');

                        spec.server = res;
                        done();
                    };
                });
            });
        });

        it('should allow adding indexes to an existing object store with indexes', function (done) {
            var spec = this;
            db.open({
                server: dbName,
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
                    server: dbName,
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

                    var req = indexedDB.open(dbName, 2);
                    req.onsuccess = function (e) {
                        var res = e.target.result;

                        var transaction = res.transaction('test');
                        var store = transaction.objectStore('test');
                        var indexNames = Array.prototype.slice.call(store.indexNames);

                        expect(indexNames.length).toEqual(2);
                        expect(indexNames).toContain('firstName');
                        expect(indexNames).toContain('age');

                        spec.server = res;
                        done();
                    };
                });
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
