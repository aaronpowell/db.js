(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('db.delete', function () {
        var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            this.dbName = guid();
            var request = indexedDB.deleteDatabase(this.dbName);

            request.onsuccess = function () {
                done();
            };
            request.onerror = function (e) {
                done(e);
            };
            request.onblocked = function (e) {
                done(e);
            };
        });
        it('should delete a created db', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: 1,
                schema: {
                    test: {
                    }
                }
            }).then(function (s) {
                s.close();
                db.delete(spec.dbName).then(function () {
                    var request = indexedDB.open(spec.dbName);
                    request.onupgradeneeded = function (e) {
                        expect(e.oldVersion).to.equal(0);
                        e.target.transaction.abort();
                        done();
                    };
                });
            }, function (err) {
                done(err);
            });
        });
    });
})(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach);
