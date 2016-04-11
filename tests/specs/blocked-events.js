/*globals guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('blocked events', function () {
        this.timeout(5000);
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

        afterEach(function () {
            // We close the connection so that subsequent files are not blocked
            if (this.server && !this.server.isClosed()) {
                this.server.close();
            }
            this.server = undefined;

            var req = indexedDB.deleteDatabase(this.dbName); // eslint-disable-line no-unused-vars
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
                // expect(err.oldVersion).to.equal(initialVersion); // Problem in FF: https://bugzilla.mozilla.org/show_bug.cgi?id=1220279
                expect(err.newVersion).to.equal(null);
                expect(err.type).to.equal('blocked');
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

        it('should trigger a version change event in another window and be able to resume once unblocked', function (done) {
            this.server.close(); // We don't want a connection yet
            var spec = this;
            schema.changed = schema.test;
            var ourOrigin = window.location.origin;
            var resumed = false;
            var finished = false;
            self.addEventListener('message', function (e) {
                if (e.origin !== ourOrigin || typeof e.data !== 'string') {
                    return;
                }
                switch (e.data) {
                case 'message-listeners2-ready': {
                    break;
                }
                case 'versionchange-listeners2-ready': {
                    db.open({
                        server: spec.dbName,
                        version: newVersion,
                        schema: schema
                    }).then(function (s) { // Chrome and Firefox both get to the "done"
                        resumed = true;
                        if (finished) {
                            done();
                        }
                    });
                    break;
                }
                case 'versionchange2-fired-and-finished': {
                    if (!resumed) {
                        finished = true;
                        return;
                    }
                    // We add this just in case the versionchange events close
                    //   the connection and cause a resumption of the "then" above
                    //   before the "finished" event can be received here (as
                    //   sent from the same versionchange events)
                    done();
                    break;
                }
                }
            });
            var ifr = document.createElement('iframe');
            ifr.style.display = 'none';
            ifr.onload = function () {
                ifr.contentWindow.postMessage(['start', spec.dbName], ourOrigin);
            };
            ifr.src = 'helpers/other-dbjs-instance.html';
            document.body.appendChild(ifr);
        });
        // The beforeEach behavior creates an open (blocking) connection by
        //   default, so if you wish for a test which does not begin in
        //   this manner, you must first close the connection:
        // this.server.close();
    });
})(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach);
