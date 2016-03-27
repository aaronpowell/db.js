/*global guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('server.handlers', function () {
        this.timeout(5000);

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
                        done();
                    }
                );
            });
        });

        afterEach(function () {
            if (this.server && !this.server.isClosed()) {
                this.server.close();
            }
            this.server = undefined;

            // PhantomJS doesn't like handlers added here
            var req = indexedDB.deleteDatabase(this.dbName); // eslint-disable-line no-unused-vars
        });

        it('should receive abort events', function (done) {
            this.server.addEventListener('abort', function (vce) {
                expect(vce.target.error).to.equal(null);
                done();
            });
            var tx = this.server.getIndexedDB().transaction('test');
            tx.abort();
        });

        it('should receive abort events (simple syntax)', function (done) {
            this.server.abort(function (vce) {
                expect(vce.target.error).to.equal(null);
                done();
            });
            var tx = this.server.getIndexedDB().transaction('test');
            tx.abort();
        });

        it('should receive versionchange events', function (done) {
            var spec = this;
            var alreadyRan = false;
            this.server.addEventListener('versionchange', function (vce) {
                alreadyRan = true;
                expect(vce.newVersion).to.equal(newVersion);
            });
            this.server.addEventListener('versionchange', function (vce) {
                expect(alreadyRan).to.be.true;
                expect(vce.newVersion).to.equal(newVersion);
                if (spec.server && !spec.server.isClosed()) {
                    spec.server.close(); // Will otherwise cause a blocked event
                }
            });
            db.open({
                server: this.dbName,
                version: newVersion,
                schema: schema
            }).catch(function (e) {
                if (e.type !== 'blocked') {
                    return Promise.reject('Unexpected error in versionchange test');
                }
                if (spec.server && !spec.server.isClosed()) {
                    spec.server.close();
                }
                // PhantomJS is mistakenly blocking here, but we can just resume
                return e.resume;
            }).then(function (dbr) {
                if (!dbr.isClosed()) {
                    dbr.close();
                }
                done();
            });
        });

        it('should receive IDBDatabase error events', function (done) {
            this.server.close();
            var badVersion = 1;
            db.open({
                server: this.dbName,
                version: badVersion,
                schema: schema
            }).then(function (dbr) { // Should not get here
                if (!dbr.isClosed()) {
                    dbr.close();
                }
            }).catch(function (err) {
                expect(err.oldVersion).to.be.undefined;
                expect(err.newVersion).to.be.undefined;
                expect(err.type).to.equal('error');
                done();
            });
        });

        it('should receive IDBRequest error events', function (done) {
            var bubbleCount = 0;
            this.server.addEventListener('error', function (vce) {
                expect(vce.type).to.equal('error');
                expect(bubbleCount).to.equal(2);
                done();
            });

            var tx = this.server.getIndexedDB().transaction('test', 'readwrite');
            tx.onerror = function (err) {
                expect(err.type).to.equal('error');
                bubbleCount++;
            };
            var store = tx.objectStore('test');
            var request = store.add({specialID: 5});
            request.onerror = function (err) {
                expect(err.type).to.equal('error');
                bubbleCount++;
            };
        });

        it('should have removeEventListener remove events if and only if of the right type', function (done) {
            var testCount = 0;
            function incAndTest () {
                testCount++;
                if (testCount > 1) {
                    done();
                }
            }
            function abortHandler (vce) {
                expect(true).to.be.false;
            }
            function errorHandler (vce) {
                incAndTest();
            }
            function versionChange1 (vce) {
                expect(true).to.be.false;
            }
            function versionChange2 (vce) {
                expect(vce.newVersion).to.equal(newVersion);
                spec.server.close(); // Will otherwise cause a blocked event
                incAndTest();
            }

            this.server.addEventListener('abort', abortHandler);
            this.server.addEventListener('error', errorHandler);
            this.server.addEventListener('versionchange', versionChange1);
            this.server.addEventListener('versionchange', versionChange2);
            this.server.removeEventListener('abort', abortHandler);
            this.server.removeEventListener('versionchange', versionChange1);

            // Trigger error
            var tx = this.server.getIndexedDB().transaction('test', 'readwrite');
            var store = tx.objectStore('test');
            var request = store.add({specialID: 5}); // eslint-disable-line no-unused-vars

            // Trigger abort
            tx = this.server.getIndexedDB().transaction('test');
            tx.abort();

            // Trigger versionchange
            var spec = this;
            db.open({
                server: this.dbName,
                version: newVersion,
                schema: schema
            }).then(function (dbr) {
                if (!dbr.isClosed()) {
                    dbr.close();
                }
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
