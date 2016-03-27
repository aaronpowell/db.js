/*global guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';

    describe('server.update', function () {
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

        it('should update the item after it is added', function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            var spec = this;

            spec.server.add('test', item).then(function (/* records */) {
                item.firstName = 'John';
                item.lastName = 'Smith';

                spec.server
                    .test
                    .update(item)
                    .then(function (/* records */) {
                        spec.server
                            .test
                            .get(item.id)
                            .then(function (record) {
                                expect(record).to.not.be.undefined;
                                expect(record.id).to.equal(item.id);
                                expect(record.firstName).to.equal(item.firstName);
                                expect(record.lastName).to.equal(item.lastName);
                                expect(record).not.to.equal(item);
                                done();
                            });
                    });
            });
        });
        it('should update an array of items after it is added', function (done) {
            var items = [{
                firstName: 'Aaron',
                lastName: 'Powell'
            }, {
                firstName: 'Brett',
                lastName: 'Zamir'
            }];

            var spec = this;
            spec.server.add('test', items).then(function (/* records */) {
                var newItems = [{
                    firstName: 'John',
                    lastName: 'Smith',
                    id: items[0].id
                }, {
                    firstName: 'James',
                    lastName: 'Doe',
                    id: items[1].id
                }];

                spec.server
                    .test
                    .update(newItems)
                    .then(function (/* records */) {
                        var item = newItems[1];
                        spec.server
                            .test
                            .get(item.id)
                            .then(function (record) {
                                expect(record).to.not.be.undefined;
                                expect(record.id).to.equal(item.id);
                                expect(record.firstName).to.equal(item.firstName);
                                expect(record.lastName).to.equal(item.lastName);
                                expect(record).not.to.equal(item);
                                done();
                            });
                    });
            });
        });

        it('should allow updating of multiple items', function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Bob',
                lastName: 'Down'
            };

            var spec = this;
            spec.server.add('test', item, item2).then(function (/* records */) {
                item.firstName = 'John';
                item.lastName = 'Smith';

                item2.firstName = 'Billy';
                item2.lastName = 'Brown';

                spec.server
                    .test
                    .update(item, item2)
                    .then(function (/* records */) {
                        spec.server
                            .test
                            .query()
                            .all()
                            .execute()
                            .then(function (records) {
                                expect(records.length).to.equal(2);

                                var record = records[0];
                                expect(record).to.not.be.undefined;
                                expect(record.id).to.equal(item.id);
                                expect(record.firstName).to.equal(item.firstName);
                                expect(record.lastName).to.equal(item.lastName);
                                expect(record).not.to.equal(item);

                                record = records[1];
                                expect(record).to.not.be.undefined;
                                expect(record.id).to.equal(item2.id);
                                expect(record.firstName).to.equal(item2.firstName);
                                expect(record.lastName).to.equal(item2.lastName);
                                expect(record).not.to.equal(item2);
                                done();
                            });
                    });
            });
        });

        it('should add the item if not yet added', function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            var spec = this;

            item.firstName = 'John';
            item.lastName = 'Smith';
            spec.server.test.update(item).then(function (/* records */) {
                spec.server
                    .test
                    .get(item.id)
                    .then(function (record) {
                        expect(record).to.not.be.undefined;
                        expect(record.id).to.equal(item.id);
                        expect(record.firstName).to.equal(item.firstName);
                        expect(record.lastName).to.equal(item.lastName);
                        expect(record).not.to.equal(item);
                        done();
                    });
            });
        });
    });

    describe('server.update-custom-keys', function () {
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

        it('should allow updating with custom keys', function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var key = 'foo';

            var spec = this;
            spec.server
                .add('test', {
                    item: item,
                    key: key
                })
                .then(function (/* records */) {
                    item.firstName = 'John';
                    item.lastName = 'Smith';

                    spec.server
                        .test
                        .update({
                            item: item,
                            key: key
                        })
                        .then(function (/* records */) {
                            spec.server
                                .test
                                .query()
                                .all()
                                .execute()
                                .then(function (records) {
                                    done = true;

                                    expect(records.length).to.equal(1);

                                    var record = records[0];
                                    expect(record).to.not.be.undefined;
                                    expect(record.__id__).to.equal(key);
                                    expect(record.firstName).to.equal(item.firstName);
                                    expect(record.lastName).to.equal(item.lastName);
                                    expect(record).not.to.equal(item);
                                });
                            done();
                        });
                });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
