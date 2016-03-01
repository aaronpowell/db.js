/*global window, console*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('db.close', function () {
        var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            this.dbName = guid();
            var req = indexedDB.deleteDatabase(this.dbName);

            req.onsuccess = function () {
                done();
            };

            req.onerror = function (e) {
                console.log('error deleting db', arguments);
                done(e);
            };

            req.onblocked = function (e) {
                console.log('db blocked on delete', arguments);
                done(e);
            };
        }, 10000);

        afterEach(function (done) {
            if (this.server && !this.server.isClosed()) {
                this.server.close();
            }
            var req = indexedDB.deleteDatabase(this.dbName);

            req.onsuccess = function (/* e */) {
                done();
            };

            req.onerror = function (e) {
                console.log('failed to delete db', arguments);
                done(e);
            };

            req.onblocked = function (e) {
                console.log('db blocked', arguments);
                done(e);
            };
        });

        it('should close the database', function (done) {
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
                            x: {}
                        }
                    }
                }
            }).then(function (s) {
                s.close();
                expect(s.isClosed()).to.equal(true);
                done();
            }, function (err) {
                console.error(err);
                done(err);
            });
        });

        it ('should reject when trying to work with a closed database', function (done) {
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
                            x: {}
                        }
                    }
                }
            })
            .then(function (s) {
                s.close();
                return s;
            })
            .then(function (s) {
                return s.add('test', { a: 1 });
            })
            .catch(function (err) {
                expect(err).to.not.be.undefined;
                done();
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
