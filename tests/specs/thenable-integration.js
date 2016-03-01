(function (db, describe, it, expect, beforeEach, afterEach, $) {
    'use strict';

    describe('thenable library promise integration', function () {
        var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            this.dbName = guid();
            var spec = this;

            spec.server = undefined;

            var req = indexedDB.deleteDatabase(spec.dbName);

            req.onsuccess = function () {
                db.open({
                    server: spec.dbName,
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
            };

            req.onerror = function () {
                console.log('failed to delete db in beforeEach', arguments);
            };

            req.onblocked = function () {
                console.log('db blocked', arguments, spec);
            };
        });

        afterEach(function (done) {
            if (this.server && !this.server.isClosed()) {
                this.server.close();
            }

            var spec = this;

            var req = indexedDB.deleteDatabase(this.dbName);

            req.onsuccess = function () {
                done();
            };

            req.onerror = function () {
                console.log('failed to delete db in afterEach', arguments, spec);
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
                  expect(queryData[ 0 ].firstName).to.equal('Aaron');
                  expect(queryData[ 0 ].lastName).to.equal('Powell');
                  done();
              });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach, window.jQuery));
