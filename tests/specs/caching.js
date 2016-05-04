/*global window, guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    describe('caching', function () {
        this.timeout(5000);

        beforeEach(function (done) {
            this.dbName = guid();
            done();
        });
        afterEach(function () {
            if (this.server && !this.server.isClosed()) {
                this.server.close();
            }
            this.server = undefined;

            indexedDB.deleteDatabase(this.dbName);
        });

        it('should obtain the same (cached) db result (without blocking problems) with unnumbered version', function (done) {
            var spec = this;
            db.open({server: this.dbName}).then(function (s) {
                var db1 = s.getIndexedDB();
                db.open({server: spec.dbName}).then(function (server) {
                    var db2 = server.getIndexedDB();
                    expect(db1).to.equal(db2);
                    done();
                });
            });
        });

        it('should obtain the same (cached) db result (without blocking problems) with numbered version', function (done) {
            var spec = this;
            db.open({server: this.dbName, version: 2}).then(function (s) {
                var db1 = s.getIndexedDB();
                db.open({server: spec.dbName, version: 2}).then(function (server) {
                    var db2 = server.getIndexedDB();
                    expect(db1).to.equal(db2);
                    done();
                });
            });
        });

        it('should obtain different (cached) db results for differently numbered versions', function (done) {
            var spec = this;
            db.open({server: this.dbName, version: 1}).then(function (s) {
                var db1 = s.getIndexedDB();
                db.open({server: spec.dbName, version: 2})
                .then(function (server) {
                    var db2 = server.getIndexedDB();
                    expect(db1).to.not.equal(db2);
                    server.close();
                    done();
                });
            });
        });

        it('should obtain different (cached) db results (without blocking problems) with different server names', function (done) {
            db.open({server: this.dbName}).then(function (s) {
                var db1 = s.getIndexedDB();
                var anotherName = 'anotherName';
                db.open({server: anotherName}).then(function (server) {
                    var db2 = server.getIndexedDB();
                    expect(db1).to.not.equal(db2);
                    server.close();
                    // Clean-up for any subsequent tests
                    db.delete(anotherName).then(function () {
                        done();
                    });
                });
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
