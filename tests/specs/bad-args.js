/*global window, guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    var key1, key2; // eslint-disable-line no-unused-vars
    describe('bad args', function () {
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

        it('should catch bad args to cmp', function (done) {
            db.cmp(key1, null).catch(function (err) {
                expect(err.name).to.equal('DataError');
                done();
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
