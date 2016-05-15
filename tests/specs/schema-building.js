/*global window, guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('schema-building', function () {
        describe('schemas', function () {
            this.timeout(8000);
            var indexedDB = window.indexedDB || window.webkitIndexedDB ||
                window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

            beforeEach(function (done) {
                this.dbName = guid();
                done();
            });

            afterEach(function () {
                if (this.server && !this.server.isClosed()) {
                    this.server.close();
                }
                this.server = undefined;

                indexedDB.deleteDatabase(this.dbName);
            });

            function confirmSchema (s, dbName, cb) {
                s.close();
                var req = indexedDB.open(dbName);
                req.onsuccess = function (e) {
                    var res = e.target.result;
                    expect(res.objectStoreNames.contains('oldStore')).to.equal(false);
                    expect(res.objectStoreNames.contains('person')).to.equal(false);
                    expect(res.objectStoreNames.contains('addresses')).to.equal(true);
                    expect(res.objectStoreNames.contains('phoneNumbers')).to.equal(true);
                    expect(res.objectStoreNames.contains('people')).to.equal(true);
                    var trans = res.transaction(['people', 'addresses']);
                    var people = trans.objectStore('people');
                    expect(people.keyPath).to.equal('id');
                    expect(people.autoIncrement).to.equal(true);
                    expect(people.indexNames.contains('firstName')).to.equal(true);
                    expect(people.indexNames.contains('answer')).to.equal(true);
                    var answer = people.index('answer');
                    expect(answer.unique).to.equal(true);
                    var addresses = trans.objectStore('addresses');
                    expect(addresses.keyPath).to.equal(null);
                    cb();
                };
            }

            it('should support "whole" type schemas', function (done) {
                // Parallels "merge" type test
                var spec = this;
                var schemas = {
                    1: {
                        oldStore: {},
                        person: {},
                        addresses: {'keyPath': 'old'},
                        phoneNumbers: {}
                    },
                    2: {
                        addresses: {},
                        phoneNumbers: {},
                        people: {
                            moveFrom: 'person',
                            // Optionally add parameters for creating the object store
                            keyPath: 'id',
                            autoIncrement: true,
                            // Optionally add indexes
                            indexes: {
                                firstName: {},
                                answer: {unique: true}
                            }
                        }
                    }
                };
                db.open({server: this.dbName, schemaType: 'whole', schemas: schemas}).then(function (s) {
                    confirmSchema(s, spec.dbName, done);
                });
            });
            it('should support "merge" type schemas', function (done) {
                // Parallels "whole" type test
                var spec = this;
                var schemas = {
                    1: {
                        oldStore: {},
                        person: {},
                        addresses: {'keyPath': 'old'},
                        phoneNumbers: {}
                    },
                    2: {
                        oldStore: '\0',
                        addresses: {},
                        people: {
                            moveFrom: 'person',
                            // Optionally add parameters for creating the object store
                            keyPath: 'id',
                            autoIncrement: true,
                            // Optionally add indexes
                            indexes: {
                                firstName: {},
                                answer: {unique: true}
                            }
                        }
                    }
                };
                db.open({server: this.dbName, schemaType: 'merge', schemas: schemas}).then(function (s) {
                    confirmSchema(s, spec.dbName, done);
                });
            });
            it('should support "mixed" type schemas', function (done) {
                // Test whole, merge, idb-schema, mixed children
                var spec = this;
                var schemas = {
                    1: [
                        {'whole': {
                            addresses: {'keyPath': 'old'},
                            phoneNumbers: {}
                        }},
                        {'idb-schema': function (idbschema) {
                            idbschema.addStore('oldStore').addStore('person');
                        }}
                    ],
                    2: [{'merge': {
                        oldStore: '\0',
                        addresses: {},
                        people: {
                            moveFrom: 'person',
                            // Optionally add parameters for creating the object store
                            keyPath: 'id',
                            autoIncrement: true,
                            // Optionally add indexes
                            indexes: {
                                firstName: {},
                                answer: {unique: true}
                            }
                        }
                    }}]
                };
                db.open({server: this.dbName, schemaType: 'mixed', schemas: schemas}).then(function (s) {
                    confirmSchema(s, spec.dbName, done);
                });
            });
            it('should support "idb-schema" type schemas', function (done) {
                // Parallels test for schemaBuilder
                var spec = this;
                var v1to3 = {
                    1: function (idbs) {
                        idbs
                            .addStore('books', { keyPath: 'isbn' })
                            .addIndex('byTitle', 'title', { unique: true })
                            .addIndex('byAuthor', 'author');
                    },
                    2: function (idbs) {
                        idbs
                            .getStore('books')
                            .addIndex('byDate', ['year', 'month']);
                    },
                    3: function (idbs) {
                        idbs
                            .addStore('magazines')
                            .addIndex('byPublisher', 'publisher')
                            .addIndex('byFrequency', 'frequency');
                    }
                };
                var v1to4 = Object.assign({
                    4: function (idbs) {
                        idbs
                            .getStore('magazines')
                            .delIndex('byPublisher')
                            .addCallback(function (e, s) {
                                return s.books.query('byTitle').all().modify({
                                    textISBN: function (record) {
                                        return 'My ISBN: ' + (record.isbn || '(none)');
                                    }
                                }).execute();
                            });
                    }
                }, v1to3);
                var gotISBN = false;
                db.open({server: this.dbName, schemaType: 'idb-schema', schemas: v1to3}).then(function (s3) {
                    return s3.books.add({title: 'A Long Time Ago', isbn: '1234567890'}).then(function (result) {
                        s3.close();
                        return db.open({server: spec.dbName, schemaType: 'idb-schema', schemas: v1to4, version: 4});
                    }).then(function (s4) {
                        s4.books.get('1234567890').then(function (record) {
                            gotISBN = true;
                            expect(record.textISBN).to.equal('My ISBN: 1234567890');
                            return s4.magazines.query('byPublisher').all().execute();
                        }).catch(function (errorFromNowMissingIndex) {
                            expect(gotISBN).to.equal(true);
                            expect(errorFromNowMissingIndex.name).to.equal('NotFoundError');
                            s4.close();
                            done();
                        });
                    });
                });
            });
        });
        describe('schemaBuilder', function () {
            // Parallels test for idb-schema
            this.timeout(8000);
            var indexedDB = window.indexedDB || window.webkitIndexedDB ||
                window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

            beforeEach(function (done) {
                this.dbName = guid();
                done();
            });

            afterEach(function () {
                if (this.server && !this.server.isClosed()) {
                    this.server.close();
                }
                this.server = undefined;

                indexedDB.deleteDatabase(this.dbName);
            });

            it('should let schemaBuilder modify stores, indexes, and add callback (to modify content) by incremental versions', function (done) {
                var spec = this;
                function v1to3 (idbs) {
                    idbs.version(1)
                      .addStore('books', { keyPath: 'isbn' })
                      .addIndex('byTitle', 'title', { unique: true })
                      .addIndex('byAuthor', 'author')
                    .version(2)
                      .getStore('books')
                      .addIndex('byDate', ['year', 'month'])
                    .version(3)
                      .addStore('magazines')
                      .addIndex('byPublisher', 'publisher')
                      .addIndex('byFrequency', 'frequency');
                }
                function v1to4 (idbs) {
                    v1to3(idbs);
                    idbs.version(4)
                        .getStore('magazines')
                        .delIndex('byPublisher')
                        .addCallback(function (e, s) {
                            return s.books.query('byTitle').all().modify({
                                textISBN: function (record) {
                                    return 'My ISBN: ' + (record.isbn || '(none)');
                                }
                            }).execute();
                        });
                }
                var gotISBN = false;
                db.open({server: this.dbName, schemaBuilder: v1to3}).then(function (s3) {
                    return s3.books.add({title: 'A Long Time Ago', isbn: '1234567890'}).then(function (result) {
                        s3.close();
                        return db.open({server: spec.dbName, schemaBuilder: v1to4, version: 4});
                    }).then(function (s4) {
                        s4.books.get('1234567890').then(function (record) {
                            gotISBN = true;
                            expect(record.textISBN).to.equal('My ISBN: 1234567890');
                            return s4.magazines.query('byPublisher').all().execute();
                        }).catch(function (errorFromNowMissingIndex) {
                            expect(gotISBN).to.equal(true);
                            expect(errorFromNowMissingIndex.name).to.equal('NotFoundError');
                            s4.close();
                            done();
                        });
                    });
                });
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
