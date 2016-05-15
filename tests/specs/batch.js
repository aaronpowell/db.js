/*global guid */
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';

    describe('batch', function () {
        this.timeout(5000);
        var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            var spec = this;
            this.dbName = guid();

            db.open({
                server: this.dbName,
                version: 1,
                schema: {
                    books: {
                        indexes: {
                            'byTitle': {
                                keyPath: 'title',
                                unique: true
                            },
                            'byAuthor': {keyPath: 'author'}
                        }
                    },
                    magazines: {
                        keyPath: 'id',
                        autoIncrement: true,
                        indexes: {
                            byName: {keyPath: 'name'},
                            byNameAndFrequency: {keyPath: ['name', 'frequency'], unique: true} // Compound index
                        }
                    },
                    storage: {
                        indexes: {
                            byFoo: {keyPath: 'foo'}
                        }
                    }
                }
            }).then(function (s) {
                spec.server = s;
                expect(spec.server).to.not.be.undefined;
                done();
            });
        });

        afterEach(function (done) {
            if (this.server && !this.server.isClosed()) {
                this.server.close();
            }
            this.server = undefined;

            indexedDB.deleteDatabase(this.dbName);
            done();
        });
        describe('tableBatch()', function () {
            it('supports object syntax', function () {
                var books = this.server.books;
                return books.tableBatch({
                    key1: { title: 'B1', author: 'Bob' },
                    key2: { title: 'B2', author: 'Bob' },
                    3: { title: 'B3', author: 'Karl' }
                }).then(function (res1) {
                    expect(res1.sort()).eql(['key1', 'key2', '3'].sort()); // object keys don't guarantee order
                    return books.count();
                }).then(function (val1) {
                    expect(val1).equal(3);
                    return books.get('key1');
                }).then(function (val2) {
                    expect(val2).eql({ title: 'B1', author: 'Bob' });
                    return books.get('3');
                }).then(function (val3) {
                    expect(val3).eql({ title: 'B3', author: 'Karl' });
                    return books.get(3);
                }).then(function (val4) {
                    expect(val4).eql(undefined);
                    return books.tableBatch({
                        key1: '\0',
                        key2: '\0',
                        3: { title: 'B3', author: 'Bob' }
                    });
                }).then(function (res2) {
                    expect(res2.sort()).eql([undefined, undefined, '3'].sort());
                    return books.count();
                }).then(function (val1) {
                    expect(val1).equal(1);
                    return books.get('3');
                }).then(function (val2) {
                    expect(val2).eql({ title: 'B3', author: 'Bob' });
                });
            });
            it('supports array syntax', function () {
                var mags = this.server.magazines;
                return mags.tableBatch([
                    {type: 'add', key: 1, value: {name: 'M1', frequency: 12}},
                    {type: 'add', key: 2, value: {name: 'M2', frequency: 24}},
                    {type: 'add', value: {id: 3, name: 'M3', frequency: 6}},
                    {type: 'add', value: {id: 4, name: 'M4', frequency: 52}}
                ]).then(function (res1) {
                    expect(res1).eql([1, 2, 3, 4]);
                    return mags.count();
                }).then(function (val1) {
                    expect(val1).equal(4);
                    return mags.get(2);
                }).then(function (val2) {
                    expect(val2).eql({id: 2, name: 'M2', frequency: 24});
                    return mags.get(4);
                }).then(function (val3) {
                    expect(val3).eql({id: 4, name: 'M4', frequency: 52});
                    return mags.tableBatch([
                        {type: 'del', key: 1},
                        {type: 'put', key: 2, value: {name: 'M2', frequency: 24, foo: 'bar'}},
                        {type: 'del', key: 3}
                    ]);
                }).then(function (res2) {
                    expect(res2).eql([undefined, 2, undefined]);
                    return mags.count();
                }).then(function (val1) {
                    expect(val1).equal(2);
                    return mags.get(2);
                }).then(function (val2) {
                    expect(val2).eql({id: 2, name: 'M2', frequency: 24, foo: 'bar'});
                    return mags.tableBatch([{type: 'clear'}]);
                }).then(function (res3) {
                    expect(res3).eql([undefined]);
                    return mags.count();
                }).then(function (val1) {
                    expect(val1).equal(0);
                });
            });
            it('supports special array syntax', function () {
                var mags = this.server.magazines;
                return mags.tableBatch([
                    { add: { key: 1, value: { name: 'M1', frequency: 12 } } },
                    { add: [
                        { key: 2, value: { name: 'M2', frequency: 24 } },
                        { value: { id: 3, name: 'M3', frequency: 6 } },
                        { value: { id: 4, name: 'M4', frequency: 52 } }
                    ] }
                ]).then(function (res1) {
                    expect(res1).eql([1, 2, 3, 4]);
                    return mags.count();
                }).then(function (val1) {
                    expect(val1).equal(4);
                    return mags.get(2);
                }).then(function (val2) {
                    expect(val2).eql({ id: 2, name: 'M2', frequency: 24 });
                    return mags.get(4);
                }).then(function (val3) {
                    expect(val3).eql({ id: 4, name: 'M4', frequency: 52 });
                    return mags.tableBatch([
                        { del: { key: 1 } },
                        { put: { key: 2, value: { name: 'M2', frequency: 24, foo: 'bar' } } },
                        { del: [{ key: 3 }] }
                    ]);
                }).then(function (res2) {
                    expect(res2).eql([undefined, 2, undefined]);
                    return mags.count();
                }).then(function (val1) {
                    expect(val1).equal(2);
                    return mags.get(2);
                }).then(function (val2) {
                    expect(val2).eql({ id: 2, name: 'M2', frequency: 24, foo: 'bar' });
                    return mags.tableBatch([{ clear: {} }]);
                }).then(function (res3) {
                    expect(res3).eql([undefined]);
                    return mags.count();
                }).then(function (val1) {
                    expect(val1).equal(0);
                });
            });

            it('works with any type of data (not only objects)', function () {
                var storage = this.server.storage;
                return storage.tableBatch({
                    key1: 'value',
                    key2: 123456,
                    key3: [1, 2, 3],
                    key4: { foo: 'bar' },
                    key5: '\0abc',
                    key6: '\0\0def'
                }).then(function () {
                    return storage.count();
                }).then(function (val1) {
                    expect(val1).equal(6);
                    return storage.get('key1');
                }).then(function (val2) {
                    expect(val2).equal('value');
                    return storage.get('key2');
                }).then(function (val3) {
                    expect(val3).equal(123456);
                    return storage.get('key3');
                }).then(function (val4) {
                    expect(val4).eql([1, 2, 3]);
                    return storage.get('key4');
                }).then(function (val5) {
                    expect(val5).eql({ foo: 'bar' });
                    return storage.get('key5');
                }).then(function (val6) {
                    expect(val6).eql('abc');
                    return storage.get('key6');
                }).then(function (val7) {
                    expect(val7).eql('\0def');
                });
            });
        });

        describe('batch()', function () {
            it('supports batch in series', function () {
                var gotCbResults = false;
                var gotCb2Results = false;
                var spec = this.server;
                var prom;
                return spec.batch([
                    {
                        magazines: [
                            { type: 'add', key: 1, value: { name: 'M1', frequency: 12 } },
                            { type: 'add', key: 2, value: { name: 'M2', frequency: 24 } },
                            { type: 'add', key: 3, value: { name: 'M3', frequency: 6 } },
                            { type: 'del', key: 2 }
                        ]
                    },
                    function callbackInTransaction (tr) {
                        prom = new Promise(function (resolve) {
                            var magazines = tr.objectStore('magazines');
                            var req = magazines.add({ name: 'M4', frequency: 8, id: 5 });
                            req.onsuccess = function (e) {
                                expect(e.target.result).equal(5);
                                // We can't do a timeout here as with the parallel test as we need the transaction to be the same
                                var req2 = magazines.put({ name: 'M1', frequency: 17, id: 1 });
                                req2.onsuccess = function (e2) {
                                    expect(e2.target.result).equal(1);
                                    gotCbResults = true;
                                    expect(gotCb2Results).equal(false);
                                    resolve('finished');
                                };
                            };
                        });
                        return prom;
                    },
                    function callback2InTransaction (tr) {
                        var magazines = tr.objectStore('magazines');
                        var req = magazines.get(1);
                        req.onsuccess = function (e) {
                            gotCb2Results = true;
                            expect(e.target.result).eql({ name: 'M1', frequency: 17, id: 1 });
                        };
                    },
                    {
                        books: [
                            { type: 'put', key: 1, value: { name: 'M1', frequency: 12 } },
                            { type: 'move', key: 2, value: 1 },
                            { type: 'copy', key: 3, value: 2 }
                        ],
                        storage: 'clear'
                    }
                ]).then(function (res) {
                    expect(res).eql([{ magazines: [1, 2, 3, undefined] }, prom, undefined, { books: [1, 2, undefined, 3], storage: [undefined] }]);
                    return spec.magazines.count();
                }).then(function (val1) {
                    expect(val1).equal(3);
                    return spec.books.count();
                }).then(function (val2) {
                    expect(val2).equal(2);
                    return spec.storage.count();
                }).then(function (val3) {
                    expect(val3).equal(0);
                    expect(gotCbResults).equal(true);
                });
            });

            it('supports batch in parallel', function (done) {
                var gotCbResults = false;
                var gotCb2Results = false;
                var spec = this.server;
                var r;
                return spec.batch([
                    {
                        magazines: [
                            { type: 'add', key: 1, value: { name: 'M1', frequency: 12 } },
                            { type: 'add', key: 2, value: { name: 'M2', frequency: 24 } },
                            { type: 'add', key: 3, value: { name: 'M3', frequency: 6 } },
                            { type: 'del', key: 2 }
                        ]
                    },
                    function callbackInTransaction (tr) {
                        return new Promise(function (resolve) {
                            var magazines = tr.objectStore('magazines');
                            var req = magazines.add({ name: 'M4', frequency: 8, id: 5 });
                            req.onsuccess = function (e) {
                                expect(e.target.result).equal(5);
                                setTimeout(function () { // To test parallel we need a timeout, but this requires our needing to
                                    // create the transaction anew (though after a long enough time to ensure the original transaction is not still open)
                                    var trans = spec.getIndexedDB().transaction('magazines', 'readwrite');
                                    var mags = trans.objectStore('magazines');
                                    var req2 = mags.put({ name: 'M1', frequency: 17, id: 1 });
                                    req2.onsuccess = function (e2) {
                                        expect(e2.target.result).equal(1);
                                        gotCbResults = true;
                                        expect(gotCb2Results).equal(true);
                                        resolve('finished');
                                    };
                                }, 500);
                            };
                        });
                    },
                    function callback2InTransaction (tr) {
                        var magazines = tr.objectStore('magazines');
                        var req = magazines.get(1);
                        req.onsuccess = function (e) {
                            gotCb2Results = true;
                            expect(gotCbResults).equal(false);
                            expect(e.target.result).eql({ name: 'M1', frequency: 12, id: 1 });
                        };
                    },
                    {
                        books: [
                            { type: 'put', key: 1, value: { name: 'M1', frequency: 12 } },
                            { type: 'move', key: 2, value: 1 },
                            { type: 'copy', key: 3, value: 2 }
                        ],
                        storage: 'clear'
                    }
                ], { parallel: true }).then(function (res) {
                    r = res;
                    expect(res).eql([{ magazines: [1, 2, 3, undefined] }, new Promise(function () {}), undefined, { books: [1, 2, undefined, 3], storage: [undefined] }]);
                    return spec.magazines.count();
                }).then(function (val1) {
                    expect(val1).equal(3);
                    return spec.books.count();
                }).then(function (val2) {
                    expect(val2).equal(2);
                    return spec.storage.count();
                }).then(function (val3) {
                    expect(val3).equal(0);
                    return r[1];
                }).then(function (result) {
                    expect(result).equal('finished');
                    done();
                });
            });
            it('supports aborting a batch transaction', function (done) {
                var spec = this;
                var server = this.server;
                server.batch([{
                    magazines: [
                        { type: 'add', key: 1, value: { name: 'M1', frequency: 12 } },
                        { type: 'add', key: 2, value: { name: 'M2', frequency: 24 } },
                        { type: 'add', key: 3, value: { name: 'M3', frequency: 6 } },
                        { type: 'del', key: 2 }
                    ]
                }, function callbackInTransaction (tr) {
                    tr.abort();
                }]).catch(function () {
                    server.abort(function (e) {
                        db.open({server: spec.dbName}).then(function (s) {
                            return s.magazines.count();
                        }).then(function (val1) {
                            expect(val1).equal(0);
                            done();
                        });
                    });
                });
            });
            it('batch function-type operations work with the db.js Server', function () {
                var spec = this;
                var server = spec.server;
                var mags = spec.server.magazines;
                var r;
                return server.batch([
                    {
                        magazines: [
                            { type: 'add', key: 1, value: { name: 'M1', frequency: 12 } },
                            { type: 'add', key: 2, value: { name: 'M2', frequency: 24 } },
                            { type: 'add', key: 3, value: { name: 'M3', frequency: 6 } },
                            { type: 'del', key: 2 }
                        ]
                    }, function callbackInTransaction (tr, s) {
                        // Transaction doesn't last long enough to chain these promises/add to separate op functions
                        s.magazines
                            .query()
                            .only(3)
                            .modify({modified: true})
                            .execute();
                        return s.magazines.put({name: 'M4', frequency: 8});
                    }
                ]).then(function (res) {
                    r = res;
                    expect(res[0].magazines).eql([1, 2, 3, undefined]);
                    return mags.count();
                }).then(function (val1) {
                    expect(val1).equal(3);
                    return mags.get(1);
                }).then(function (val2) {
                    expect(val2).eql({id: 1, name: 'M1', frequency: 12});
                    return mags.get(2);
                }).then(function (val2) {
                    expect(val2).eql(undefined);
                    return mags.get(3);
                }).then(function (val3) {
                    expect(val3).eql({id: 3, name: 'M3', frequency: 6, modified: true});
                    return r[1];
                }).then(function (cbRes) {
                    expect(cbRes[0]).eql({ name: 'M4', frequency: 8, id: 4 });
                });
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
