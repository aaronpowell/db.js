/*global guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('server.count', function () {
        this.timeout(5000);

        var indexedDB = window.indexedDB || window.webkitIndexedDB ||
            window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            var spec = this;
            this.dbName = guid();
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
                    age: 40
                };
                spec.server.test.add(spec.item1, spec.item2, spec.item3).then(function () {
                    done();
                });
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
            req.onerror = function (e) {
                console.log('failed to delete db', arguments);
            };
            req.onblocked = function () {
                console.log('db blocked', arguments);
            };
        });
        it('should count the number of items in an object store (no args)', function (done) {
            var spec = this;
            spec.server.test.count().then(function (ct) {
                expect(ct).to.equal(3);
                done();
            });
        });
        it('should count the number of items in an object store (key)', function (done) {
            var spec = this;
            spec.server.test.count(1).then(function (ct) {
                expect(ct).to.equal(1);
                done();
            });
        });
        it('should count the number of items in an object store (MongoDB-style range)', function (done) {
            var spec = this;
            spec.server.test.count({gte: 1, lt: 3}).then(function (ct) {
                expect(ct).to.equal(2);
                done();
            });
        });
        it('should count the number of items in an object store (IDBKeyRange)', function (done) {
            var spec = this;
            spec.server.test.count(IDBKeyRange.bound(1, 3, false, true)).then(function (ct) {
                expect(ct).to.equal(2);
                done();
            });
        });
    });
})(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach);
