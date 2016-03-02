(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('handlers', function () {
        var initialVersion = 2;
        var newVersion = 10;
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
                    specialID: {unique: true}
                }
            }
        };

        beforeEach(function (done) {
            this.dbName = guid();
            var spec = this;
            var req = indexedDB.deleteDatabase(this.dbName);
            req.onsuccess = function () {
                db.open({
                    server: spec.dbName,
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

        afterEach(function (done) {
            // We close the connection so that subsequent files are not blocked
            if (!this.server.isClosed()) {
                this.server.close();
            }
            done();
        });

        it('should receive onabort events', function (done) {
            this.server.test.onabort(function (vce) {
                expect(vce.target.error).to.equal(null);
                done();
            });
            var tx = this.server.getIndexedDB().transaction('test');
            tx.abort();
        });

        it('should receive versionchange events', function (done) {
            var spec = this;
            this.server.test.onversionchange(function (vce) {
                expect(vce.newVersion).to.equal(newVersion);
                spec.server.close(); // Will otherwise cause a blocked event
            });
            db.open({
                server: this.dbName,
                version: newVersion,
                schema: schema
            }).then(function (dbr) {
                if (!dbr.closed) {
                    dbr.close();
                }
                done();
            });
        });

        it('should receive IDBDatabase onerror events', function (done) {
            var badVersion = 1;
            db.open({
                server: this.dbName,
                version: badVersion,
                schema: schema
            }).catch(function (err) {
                expect(err.oldVersion).to.be.undefined;
                expect(err.newVersion).to.be.undefined;
                expect(err.type).to.equal('error');
                done();
            });
        });

        it('should receive IDBRequest onerror events', function (done) {
            this.server.test.onerror(function (vce) {
                expect(vce.type).to.equal('error');
                done();
            });

            // Todo: Test error handlers of equivalent db.js methods
            var tx = this.server.getIndexedDB().transaction('test', 'readwrite');
            tx.onerror = function (err) {
                expect(err.type).to.equal('error');
            };
            var store = tx.objectStore('test');
            var request = store.add({specialID: 5});
            request.onerror = function (err) {
                expect(err.type).to.equal('error');
            };
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
