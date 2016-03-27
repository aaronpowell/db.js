/*global guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';

    describe('server.add', function () {
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
                expect(spec.server).to.not.be.undefined;
                done();
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
                console.log('failed to delete db', arguments);
            };
            req.onblocked = function () {
                console.log('db blocked', arguments);
            };
        });

        it('should insert a new item into the object store', function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            this.server.add('test', item).then(function (records) {
                item = records[0];
                expect(item.id).to.not.be.undefined;
                expect(item.id).to.equal(1);
                done();
            });
        });

        it('should insert multiple records', function () {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'John',
                lastName: 'Smith'
            };

            this.server.add('test', item1, item2).then(function (/* records */) {
                expect(item1.id).to.not.be.undefined;
                expect(item1.id).to.equal(1);
                expect(item2.id).to.not.be.undefined;
                expect(item2.id).to.equal(2);
            });
        });
    });

    describe('server.add-non-autoincrement key', function () {
        this.timeout(10000);
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
                            autoIncrement: false
                        }
                    }
                }
            }).then(function (s) {
                spec.server = s;
                expect(spec.server).to.not.be.undefined;
                done();
            });
        });

        afterEach(function () {
            if (this.server && !this.server.isClosed()) {
                this.server.close();
            }
            this.server = undefined;

            indexedDB.deleteDatabase(this.dbName);
        });

        it('should insert a new item into the object store (non-autoincrement key)', function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell',
                id: 'abcd'
            };

            this.server.add('test', item).then(function (records) {
                item = records[0];
                expect(item.id).to.not.be.undefined;
                expect(item.id).to.equal('abcd');
                done();
            });
        });
    });

    describe('server.add no keyPath', function () {
        this.timeout(5000);

        var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            var spec = this;
            this.dbName = guid();

            db.open({
                server: this.dbName,
                version: 1,
                schema: {
                    test: {
                        key: {
                            autoIncrement: true
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

            var req = indexedDB.deleteDatabase(this.dbName);

            req.onsuccess = function () {
                done();
            };

            req.onerror = function () {
                console.log('failed to delete db', arguments);
            };

            req.onblocked = function () {
                console.log('db blocked', arguments);
            };
        });

        it('should insert a new item into the object store (no keyPath)', function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            this.server.add('test', item).then(function (records) {
                item = records[0];
                expect(item.__id__).to.not.be.undefined;
                expect(item.__id__).to.equal(1);
                done();
            });
        });

        it('should insert multiple items into the object store', function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            var spec = this;
            spec.server.add('test', item1, item2).then(function (/* records */) {
                expect(item1.__id__).to.not.be.undefined;
                expect(item1.__id__).to.equal(1);
                expect(item2.__id__).to.not.be.undefined;
                expect(item2.__id__).to.equal(2);
                done();
            });
        });

        it('should insert multiple items into the object store, using an array', function (done) {
            var items = [
                {
                    firstName: 'Aaron',
                    lastName: 'Powell'
                },
                {
                    firstName: 'Aaron',
                    lastName: 'Powell'
                }
            ];

            var spec = this;
            spec.server.add('test', items).then(function (/* records */) {
                expect(items[0].__id__).to.not.be.undefined;
                expect(items[0].__id__).to.equal(1);
                expect(items[1].__id__).to.not.be.undefined;
                expect(items[1].__id__).to.equal(2);
                done();
            });
        });

        it('should insert an item with a provided key into the object store', function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            var spec = this;
            spec.server.add('test', {
                item: item1,
                key: 1.001
            }).then(function (/* records */) {
                expect(item1.__id__).to.not.be.undefined;
                expect(item1.__id__).to.equal(1.001);
                done();
            });
        });

        it('should insert an item with a provided string key into the object store', function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            var spec = this;
            spec.server.add('test', {
                item: item1,
                key: 'key'
            }).then(function (/* records */) {
                expect(item1.__id__).to.not.be.undefined;
                expect(item1.__id__).to.equal('key');
                done();
            });
        });

        it('should insert multiple items with the provided keys into the object store', function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            var spec = this;
            spec.server.add('test', {
                item: item1,
                key: 'key'
            }, {
                item: item2,
                key: 5
            }).then(function (/* records */) {
                expect(item1.__id__).to.not.be.undefined;
                expect(item1.__id__).to.equal('key');
                expect(item2.__id__).to.not.be.undefined;
                expect(item2.__id__).to.equal(5);
                done();
            });
        });

        it('should insert multiple items with mixed key generation', function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item3 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            var spec = this;
            spec.server.add('test', item1, {
                item: item2,
                key: 5
            }, item3).then(function (/* records */) {
                expect(item1.__id__).to.not.be.undefined;
                expect(item1.__id__).to.equal(1);
                expect(item2.__id__).to.not.be.undefined;
                expect(item2.__id__).to.equal(5);
                expect(item3.__id__).to.not.be.undefined;
                expect(item3.__id__).to.equal(6);
                done();
            });
        });

        it('should error when adding an item with an existing key', function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var key = 'key';

            var spec = this;
            spec.server.add('test', {
                item: item1,
                key: key
            }).then(function (/* records */) {
                spec.server.add('test', {
                    item: item1,
                    key: key
                }).then(function (/* records */) {

                }).catch(function (e) {
                    expect(e.target.error.name).to.be.string('ConstraintError');
                    done();
                });
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
