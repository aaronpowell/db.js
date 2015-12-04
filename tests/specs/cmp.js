/*global window*/
(function (db, describe, it, expect, beforeEach /*, afterEach */) {
    'use strict';
    var key1, key2;
    describe('db.cmp', function () {
        var dbName = 'tests';
        var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            var request = indexedDB.deleteDatabase(dbName);

            request.onsuccess = function () {
                var req = indexedDB.open(dbName);
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
                request.onblocked = function (e) {
                    done(e);
                };
            };
            request.onerror = function (e) {
                done(e);
            };
            request.onblocked = function (e) {
                done(e);
            };
        });

        it('db.cmp should return 1, -1, or 0 as expected for key comparions', function (done) {
            var cmp = db.cmp(key1, key2);
            expect(cmp).toEqual(-1);
            cmp = db.cmp(key2, key2);
            expect(cmp).toEqual(0);
            cmp = db.cmp(key2, key1);
            expect(cmp).toEqual(1);
            done();
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
