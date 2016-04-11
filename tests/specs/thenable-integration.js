/*global guid*/
(function (db, describe, it, expect, beforeEach, afterEach, $) {
    'use strict';

    describe('thenable library promise integration', function () {
        this.timeout(5000);
        var indexedDB = window.indexedDB || window.webkitIndexedDB ||
            window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            var spec = this;
            this.dbName = guid();
            db.open({
                server: this.dbName,
                version: 1,
                schema: {
                    test: {
                        key: {
                            keyPath: 'id',
                            autoIncrement: true
                        }
                    }
                }
            }).then(function (s) {
                spec.server = s;
            }).then(function () {
                spec.server
                    .test
                    .add({
                        firstName: 'Aaron',
                        lastName: 'Powell'
                    })
                    .then(function () {
                        done();
                    });
            });
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
            req.onerror = function () {
                console.log('failed to delete db in afterEach', arguments);
            };
            req.onblocked = function () {
                console.log('db blocked', arguments);
            };
        });

        it('should be able to work with other thenable library', function (done) {
            var queryData;
            var ajaxDeferred = $.getJSON('foo');
            var queryDeferred = this
                .server
                .test
                .query()
                .all()
                .execute();

            Promise.all([Promise.resolve(ajaxDeferred), queryDeferred])
              .then(function (resolvedArray) {
                  // var ajaxData = resolvedArray[0];
                  queryData = resolvedArray[1];
                  expect(queryData).to.not.be.undefined;
                  expect(queryData.length).to.equal(1);
                  expect(queryData[0].firstName).to.equal('Aaron');
                  expect(queryData[0].lastName).to.equal('Powell');
                  done();
              });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach, window.jQuery));
