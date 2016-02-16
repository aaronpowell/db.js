(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('db.delete', function () {
        var dbName = 'tests';
        var initialVersion = 1;
        var newVersion = 2;
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

        it('should receive blocked events (on db open) and be able to resume after unblocking', function (done) {
            // We do not close the prior beforeEach connection, so a blocking error is expected
            schema.changed = schema.test;
            var spec = this;

            var caught = false;
            db.open({
                server: dbName,
                version: newVersion,
                schema: schema
            }).catch(function (e) {
                expect(e.oldVersion).toEqual(initialVersion);
                expect(e.newVersion).toEqual(newVersion);
                expect(e.type).toEqual('blocked');
                spec.server.close(); // Ensure the last connection is closed so we can resume
                caught = true;
                return e.resume;
            }).then(function (s) {
                expect(caught).toBe(true);
                expect(s.isClosed()).toBe(false);
                s.close(); // Close this connection too to avoid blocking next set of tests
                done();
            });
        });

        it('should receive blocked events (on database delete) and be able to resume after unblocking', function (done) {
            // We do not close the prior beforeEach connection, so a blocking error is expected
            var spec = this;
            var caught = false;
            db.delete(dbName).catch(function (err) {
                expect(err.oldVersion).toEqual(initialVersion); // Problem in FF: https://bugzilla.mozilla.org/show_bug.cgi?id=1220279
                expect(err.newVersion).toEqual(null);
                spec.server.close(); // Ensure the last connection is closed so we can resume
                caught = true;
                return err.resume;
            }).then(function (ev) { // Successful deletion so no FF bug here
                expect(caught).toBe(true);
                expect(ev.oldVersion).toEqual(initialVersion);
                expect(ev.newVersion).toEqual(null);
                done();
            });
        });

        // The beforeEach behavior creates an open (blocking) connection by
        //   default, so if you wish for a test which does not begin in
        //   this manner, you must first close the connection:
        // this.server.close();
    });
})(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach);
