(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('blocked events', function () {
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

        afterEach(function (done) {
            // We close the connection so that subsequent files are not blocked
            if (this.server && !this.server.isClosed()) {
                this.server.close();
            }
            this.server = undefined;

            var req = indexedDB.deleteDatabase(this.dbName);

            req.onsuccess = function () {
                done();
            };
            req.onerror = function () {
                console.log('failed to delete db in afterEach', arguments);
            };
            req.onblocked = function () {
                console.log('db blocked', arguments);
            };
        });

        it('should receive blocked events (on db open) and be able to resume after unblocking', function (done) {
            // We do not close the prior beforeEach connection, so a blocking error is expected
            schema.changed = schema.test;
            var spec = this;

            var caught = false;
            db.open({
                server: this.dbName,
                version: newVersion,
                schema: schema
            }).catch(function (e) {
                expect(e.oldVersion).to.equal(initialVersion);
                expect(e.newVersion).to.equal(newVersion);
                expect(e.type).to.equal('blocked');
                spec.server.close(); // Ensure the last connection is closed so we can resume
                caught = true;
                return e.resume;
            }).then(function (s) {
                expect(caught).to.be.true;
                expect(s.isClosed()).to.not.be.true;
                s.close(); // Close this connection too to avoid blocking next set of tests
                done();
            });
        });

        it('should receive blocked events (on database delete) and be able to resume after unblocking', function (done) {
            // We do not close the prior beforeEach connection, so a blocking error is expected
            var spec = this;
            var caught = false;
            db.delete(this.dbName).catch(function (err) {
                expect(err.oldVersion).to.equal(initialVersion); // Problem in FF: https://bugzilla.mozilla.org/show_bug.cgi?id=1220279
                expect(err.newVersion).to.equal(null);
                spec.server.close(); // Ensure the last connection is closed so we can resume
                caught = true;
                return err.resume;
            }).then(function (ev) { // Successful deletion so no FF bug here
                expect(caught).to.be.true;
                expect(ev.oldVersion).to.equal(initialVersion);
                expect(ev.newVersion).to.equal(null);
                done();
            });
        });

        // The beforeEach behavior creates an open (blocking) connection by
        //   default, so if you wish for a test which does not begin in
        //   this manner, you must first close the connection:
        // this.server.close();
    });
})(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach);
