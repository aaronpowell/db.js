(function (db, describe, it, runs, expect, waitsFor, beforeEach, afterEach, operative) {
    'use strict';

    describe('db.js', function () {

        it('should run in a web worker', function () {
            var spec = this;
            runs(function () {
                operative.setBaseURL('http://127.0.0.1:9999/');

                // Operative code is not executed in-place. It's executed within a Worker.
                // You won't be able to access variables surrounding the definition of your operative.
                // See https://github.com/padolsey/operative
                var worker = operative({
                    run: function (cb) {
                        db.open({
                            server: 'worker-tests',
                            version: 1,
                            schema: {
                                test: {
                                    key: {
                                        keyPath: 'id',
                                        autoIncrement: true
                                    }
                                }
                            }
                        }).done(function (server) {
                            server
                                .add('test', { firstName: 'Aaron', lastName: 'Powell'})
                                .done(function (records) {
                                    server.close();
                                    var indexedDB = indexedDB || webkitIndexedDB || mozIndexedDB || oIndexedDB || msIndexedDB;
                                    var req = indexedDB.deleteDatabase('worker-tests');
                                    req.onerror = function () {
                                        cb('failed to delete db');
                                    };
                                    req.onblocked = function () {
                                        cb('db blocked');
                                    };

                                    cb(null, records[0]);
                                });
                        });
                    }
                }, ['/src/db.js']);

                worker.run(function (err, item) {
                    if (err) {
                        console.error(err);
                    } else {
                        spec.item = item;
                    }
                });

            });

            waitsFor(function () {
                return !!spec.item;
            }, 'wait on db', 500);

            runs(function () {
                expect(spec.item.id).toBeDefined();
                expect(spec.item.firstName).toBe('Aaron');
                expect(spec.item.lastName).toBe('Powell');
            });
        });


    });
})(window.db, window.describe, window.it, window.runs, window.expect, window.waitsFor, window.beforeEach, window.afterEach, window.operative);
