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

        describe('open', function () {
            it('should catch throwing schema arg', function (done) {
                db.open({server: this.dbName, schema: function () {
                    throw new Error('Bad schema');
                }}).catch(function (err) {
                    expect(err.message).to.equal('Bad schema');
                    done();
                });
            });
            it('should catch an attempt to (auto-load) a schema with a conflicting name (when there is no noServerMethods)', function (done) {
                var spec = this;
                var req = indexedDB.open(this.dbName, 2);
                req.onupgradeneeded = function () {
                    var storeNameConflictingWithMethod = 'count';
                    req.result.createObjectStore(storeNameConflictingWithMethod);
                    req.result.close();
                    db.open({server: spec.dbName, version: 2}).catch(function (err) {
                        expect(err.message).to.have.string('conflicts with db.js method names');
                        done();
                    });
                };
            });
            it('should treat version 0 as 1 being supplied (if db.js did not, it should throw an error)', function (done) {
                db.open({server: this.dbName, version: 0}).then(function (s) {
                    expect(s).to.be.defined;
                    s.close();
                    done();
                });
            });
        });

        describe('open: createSchema', function () {
            it('should catch bad key paths', function (done) {
                db.open({server: this.dbName, version: 2, schema: {
                    test: {
                        key: {
                            keyPath: 55
                        }
                    }
                }}).catch(function (err) {
                    expect(err.name).to.equal('SyntaxError');
                    done();
                });
            });
            it('should catch autoIncrement with empty key path string', function (done) {
                db.open({server: this.dbName, version: 2, schema: {
                    test: {
                        key: {
                            autoIncrement: true,
                            keyPath: ''
                        }
                    }
                }}).catch(function (err) {
                    expect(err.name).to.equal('InvalidAccessError');
                    done();
                });
            });
            it('should catch bad key path for indexes', function (done) {
                db.open({server: this.dbName, version: 2, schema: {
                    test: {
                        indexes: {
                            index1: {
                                keyPath: 55
                            }
                        }
                    }
                }}).catch(function (err) {
                    expect(err.name).to.equal('SyntaxError');
                    done();
                });
            });
            it('should catch bad multiEntry key path for indexes', function (done) {
                db.open({server: this.dbName, version: 2, schema: {
                    test: {
                        indexes: {
                            index1: {
                                multiEntry: true,
                                keyPath: ['']
                            }
                        }
                    }
                }}).catch(function (err) {
                    expect(err.name).to.equal('InvalidAccessError');
                    done();
                });
            });
        });

        describe('Server', function () {
            it('should catch addEventListener/removeEventListener errors', function (done) {
                db.open({server: this.dbName}).then(function (s) {
                    try {
                        s.addEventListener('badEvent', function () {});
                    } catch (err) {
                        expect(err.message).to.have.string('Unrecognized event type');
                    }
                    try {
                        s.removeEventListener('badEvent', function () {});
                    } catch (err) {
                        expect(err.message).to.have.string('Unrecognized event type');
                        s.close();
                        done();
                    }
                });
            });
            it('should catch Server errors related to connection already being closed', function (done) {
                db.open({server: this.dbName}).then(function (s) {
                    s.close();
                    ['count', 'get', 'close', 'clear', 'remove', 'delete', 'update', 'put', 'add', 'query'].reduce(function (promise, method) {
                        return promise.catch(function (err) {
                            expect(err.message).to.equal('Database has been closed');
                            return s[method]();
                        });
                    }, Promise.reject(new Error('Database has been closed'))).then(function (queryResult) {
                        queryResult.all().execute().catch(function (err) {
                            expect(err.message).to.equal('Database has been closed');
                            done();
                        });
                    });
                });
            });
            it('should catch bad range keys', function (done) {
                db.open({server: this.dbName}).then(function (s) {
                    s.names.get({badKey: ''}).catch(function (err) {
                        expect(err.message).to.have.string('are conflicted keys');
                        return s.names.count({badKey: ''});
                    }).catch(function (err) {
                        expect(err.message).to.have.string('are conflicted keys');
                        return s.names.query().range({badKey: ''}).execute();
                    }).catch(function (err) {
                        expect(err.message).to.have.string('is not valid key');
                        return s.names.query().only(null).execute();
                    }).catch(function (err) {
                        expect(err.name).to.have.string('DataError');
                        s.close();
                        done();
                    });
                });
            });
        });

        describe('query', function () {
            it('should catch a bad modify object method', function (done) {
                db.open({server: this.dbName}).then(function (s) {
                    s.names.query().all().modify({
                        key1: function () {
                            throw new Error('Problem modifying');
                        }
                    }).execute().catch(function (err) {
                        expect(err.message).to.equal('Problem modifying');
                        s.close();
                        done();
                    });
                });
            });
            it('should catch a bad map function', function (done) {
                db.open({server: this.dbName}).then(function (s) {
                    s.names.query().all().map(function () {
                        throw new Error('Problem mapping');
                    }).execute().catch(function (err) {
                        expect(err.message).to.equal('Problem mapping');
                        s.close();
                        done();
                    });
                });
            });
        });

        it('delete: should catch bad args', function (done) {
            var spec = this;
            db.open({server: this.dbName}).then(function (s) {
                db.delete(spec.dbName).catch(function (err) { // Other arguments (or missing arguments) do not throw
                    expect(err.type).to.equal('blocked');
                    s.close();
                    done();
                });
            });
        });

        it('cmp: should catch bad args', function (done) {
            db.cmp(key1, null).catch(function (err) {
                expect(err.name).to.equal('DataError');
                done();
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
