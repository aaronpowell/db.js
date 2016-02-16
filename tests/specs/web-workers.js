(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('web workers', function () {
        var dbName = 'tests';
        var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            var req = indexedDB.deleteDatabase(dbName);

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
            var req = indexedDB.deleteDatabase(dbName);

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

        it('should open a created db in a web worker', function (done) {
            var tw = new Worker('specs/helpers/test-worker.js');
            tw.onmessage = function (e) {
                expect(e.data).toBe(true);
                tw.terminate();
                done();
            };
            tw.postMessage('start');
        });
    });
})(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach);
