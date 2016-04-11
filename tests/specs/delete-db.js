/*global guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('db.delete', function () {
        this.timeout(5000);

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
            this.dbName = guid();
            db.open({
                server: this.dbName,
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
            req.onerror = function () {
                console.log('failed to delete db', arguments);
            };
            req.onblocked = function () {
                console.log('db blocked', arguments);
            };
        });
        it('should delete a created db', function (done) {
            var spec = this;
            db.delete(spec.dbName).then(function () {
                var request = indexedDB.open(spec.dbName);
                request.onupgradeneeded = function (e) {
                    expect(e.oldVersion).to.equal(0); // Confirm deletion had occurred
                    e.target.transaction.onabort = function () {
                        done();
                    };
                    e.target.transaction.abort();
                };
            });
        });
    });
})(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach);
