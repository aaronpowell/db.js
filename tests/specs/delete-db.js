(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('db.delete', function () {
        var dbName = 'tests';
        var initialVersion = 1;
        var indexedDB = window.indexedDB || window.webkitIndexedDB ||
            window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        var schema = {
            test: {
                key: {
                    keyPath: 'id',
                    autoIncrement: true
                },
                indexes: {
                    firstName: {},
                    age: {},
                    specialID: {}
                }
            }
        };

        beforeEach(function (done) {
            var spec = this;
            var req = indexedDB.deleteDatabase(dbName);
            req.onsuccess = function () {
                db.open({
                    server: dbName,
                    version: initialVersion,
                    schema: schema
                }).then(function (s) {
                    spec.server = s;
                }).then(function () {
                    spec.item1 = {
                        firstName: 'Aaron',
                        lastName: 'Powell',
                        age: 20
                    };
                    spec.item2 = {
                        firstName: 'John',
                        lastName: 'Smith',
                        age: 30
                    };
                    spec.item3 = {
                        firstName: 'Aaron',
                        lastName: 'Jones',
                        age: 40,
                        specialID: 5
                    };
                    spec.server.add('test', spec.item1,
                        spec.item2, spec.item3).then(function () {
                            spec.server.close();
                            done();
                        }
                    );
                });
            };

            req.onerror = function () {
                console.log('failed to delete db in beforeEach', arguments);
            };

            req.onblocked = function () {
                console.log('db blocked', arguments, spec);
            };

        });
        it('should delete a created db', function (done) {
            db.delete(dbName).then(function () {
                var request = indexedDB.open(dbName);
                request.onupgradeneeded = function (e) {
                    expect(e.oldVersion).toEqual(0); // Confirm deletion had occurred
                    e.target.transaction.onabort = function () {
                        done();
                    };
                    e.target.transaction.abort();
                };
            });
        });
    });
})(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach);
