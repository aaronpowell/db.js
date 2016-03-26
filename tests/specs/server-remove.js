/*global guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';

    describe('server.remove', function () {
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
                expect(spec.server).to.not.be.undefined;
                done();
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

        it('should remove an added item', function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            var spec = this;

            spec.server.add('test', item).then(function (records) {
                item = records[0];
                expect(item.id).to.not.be.undefined;
                spec.server.remove('test', item.id).then(function () {
                    spec.server.get('test', item.id).then(function (x) {
                        expect(x).to.equal(undefined);

                        done();
                    });
                });
            });
        });

        it('should remove all items from a table', function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Andrew',
                lastName: 'Lyon'
            };

            var spec = this;
            spec.server.add('test', item, item2).then(function (/* records */) {
                spec.server.clear('test').then(function () {
                    spec.server.query('test').all().execute().then(function (r) {
                        expect(r.length).to.equal(0);
                        done();
                    });
                });
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
