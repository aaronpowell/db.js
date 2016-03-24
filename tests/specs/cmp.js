/*global window*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    var key1, key2;
    describe('db.cmp', function () {
        var indexedDB = window.indexedDB || window.webkitIndexedDB ||
            window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            this.dbName = guid();

            var req = indexedDB.open(this.dbName);
            req.onupgradeneeded = function () {
                var objStore = req.result.createObjectStore('names', {autoIncrement: true});
                var person1 = {name: 'Alex'};
                var person2 = {name: 'Mia'};

                var addReq1 = objStore.add(person1);
                addReq1.onsuccess = function (e) {
                    key1 = e.target.result;
                    var addReq2 = objStore.add(person2);
                    addReq2.onsuccess = function (e2) {
                        key2 = e2.target.result;
                        req.result.close();
                        done();
                    };
                };
            };
            req.onblocked = function (e) {
                done(e);
            };
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
            req.onerror = function (e) {
                console.log('failed to delete db', arguments);
            };
            req.onblocked = function (e) {
                console.log('db blocked', arguments);
            };
        });

        it('db.cmp should return 1, -1, or 0 as expected for key comparions', function (done) {
            var cmp = db.cmp(key1, key2);
            expect(cmp).to.equal(-1);
            cmp = db.cmp(key2, key2);
            expect(cmp).to.equal(0);
            cmp = db.cmp(key2, key1);
            expect(cmp).to.equal(1);
            done();
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
