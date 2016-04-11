/*global window, guid*/
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    var key1, key2; // eslint-disable-line no-unused-vars
    describe('bad args', function () {
        this.timeout(5000);
        var indexedDB = window.indexedDB || window.webkitIndexedDB ||
            window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            this.dbName = guid();
            var req = indexedDB.open(this.dbName);
            req.onsuccess = function () {
                req.result.close();
                done();
            };
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
                    };
                };
            };
            req.onerror = function (e) {
                console.log('error: ' + e);
            };
            req.onblocked = function (e) {
                console.log('blocked: ' + e);
            };
        });

        afterEach(function () {
            if (this.server && !this.server.isClosed()) {
                this.server.close();
            }
            this.server = undefined;

            indexedDB.deleteDatabase(this.dbName);
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
                req.onsuccess = function () {
                    req.result.close();
                    db.open({server: spec.dbName, version: 2}).catch(function (err) {
                        expect(err.message).to.have.string('conflicts with db.js method names');
                        done();
                    });
                };
                req.onupgradeneeded = function () {
                    var storeNameConflictingWithMethod = 'count';
                    req.result.createObjectStore(storeNameConflictingWithMethod);
                };
            });
            it('should treat version 0 as 1 being supplied (if db.js did not, it should throw an error)', function (done) {
                db.open({server: this.dbName, version: 0}).then(function (s) {
                    expect(s).to.be.defined;
                    s.close();
                    done();
                });
            });
            it('should catch when keyPath is an array and multiEntry=true', function (done) {
                db.open({
                    server: this.dbName,
                    version: 2,
                    schema: {
                        test: {
                            key: {
                                keyPath: ['lastName', 'firstName']
                            },
                            indexes: {
                                name: {
                                    keyPath: ['lastName', 'firstName'],
                                    multiEntry: true
                                },
                                lastName: {},
                                firstName: {}
                            }
                        }
                    }
                }).catch(function (err) {
                    expect(err.name).to.equal('InvalidAccessError');
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
                    var ct = 0;
                    var serverMethods = ['count', 'get', 'close', 'clear', 'remove', 'delete', 'update', 'put', 'add', 'query'];
                    serverMethods.reduce(function (promise, method) {
                        return promise.catch(function (err) {
                            expect(err.message).to.equal('Database has been closed');
                            ct++;
                            return s[method]();
                        });
                    }, Promise.reject(new Error('Database has been closed')))
                    .then(function (queryResult) {
                        queryResult.all().execute().catch(function (err) {
                            expect(ct).to.equal(serverMethods.length);
                            expect(err.message).to.equal('Database has been closed');
                            done();
                        });
                    });
                });
            });

            it('should catch bad values', function (done) {
                db.open({server: this.dbName}).then(function (s) {
                    var caught = false;
                    var badValue = function () {};
                    // var badValue = NaN // This should cause an error to be thrown (a DataError error) per draft spec but doesn't in Chrome, Firefox, or PhantomJS
                    s.names.put(badValue).catch(function (err) {
                        expect(err.name).to.equal('DataCloneError');
                        // expect(err.name).to.equal('DataError'); // Will change to this per draft spec
                        caught = true;
                        return s.names.add(badValue);
                    }).catch(function (err) {
                        expect(err.name).to.equal('DataCloneError');
                        expect(caught).to.be.true;
                        done();
                    });
                });
            });

            it('should catch bad keys', function (done) {
                db.open({server: this.dbName}).then(function (s) {
                    var ct = 0;
                    var badKey = function () {};
                    s.names.get(badKey).catch(function (err) {
                        expect(err.name).to.equal('DataError');
                        ct++;
                        return s.names.count(badKey);
                    }).catch(function (err) {
                        expect(err.name).to.equal('DataError');
                        ct++;
                        return s.names.add({key: badKey, item: ''});
                    }).catch(function (err) {
                        expect(err.name).to.equal('DataError');
                        ct++;
                        return s.names.put({key: badKey, item: ''});
                    }).catch(function (err) {
                        expect(err.name).to.equal('DataError');
                        ct++;
                        return s.names.remove(badKey);
                    }).catch(function (err) {
                        expect(err.name).to.equal('DataError');
                        expect(ct).to.equal(4);
                        done();
                    });
                });
            });

            it('should catch bad range keys', function (done) {
                var ct = 0;
                var item = {
                    firstName: 'Aaron',
                    lastName: 'Powell'
                };
                db.open({server: this.dbName}).then(function (s) {
                    s.names.get({badKey: ''}).catch(function (err) {
                        expect(err.message).to.have.string('is not a valid key');
                        ct++;
                        return s.names.count({badKey: ''});
                    }).catch(function (err) {
                        expect(err.message).to.have.string('is not a valid key');
                        ct++;
                        return s.names.delete({badKey: ''});
                    }).catch(function (err) {
                        expect(err.message).to.have.string('is not a valid key');
                        ct++;
                        return s.names.add({key: {badKey: ''}, item: item});
                    }).catch(function (err) {
                        expect(err.message).to.have.string('is not a valid key');
                        ct++;
                        item = {
                            firstName: 'Mia',
                            lastName: 'Zamir'
                        };
                        return s.names.update({key: {badKey: ''}, item: item});
                    }).catch(function (err) {
                        expect(err.message).to.have.string('is not a valid key');
                        expect(ct).to.equal(4);
                        s.close();
                        done();
                    });
                });
            });
            it('Bad store names (to db.transaction)', function (done) {
                var nonexistentStore = 'nonexistentStore';
                var ct = 0;
                db.open({server: this.dbName}).then(function (s) {
                    var item = {
                        firstName: 'Aaron',
                        lastName: 'Powell'
                    };
                    s.add(nonexistentStore, item).catch(function (err) {
                        expect(err.name).to.equal('NotFoundError');
                        ct++;
                        return s.update(nonexistentStore, {firstName: 'Alex', lastName: 'Zamir'});
                    }).catch(function (err) {
                        expect(err.name).to.equal('NotFoundError');
                        ct++;
                        return s.remove(nonexistentStore, 1);
                    }).catch(function (err) {
                        expect(err.name).to.equal('NotFoundError');
                        ct++;
                        return s.clear(nonexistentStore);
                    }).catch(function (err) {
                        expect(err.name).to.equal('NotFoundError');
                        ct++;
                        return s.get(nonexistentStore, 1);
                    }).catch(function (err) {
                        expect(err.name).to.equal('NotFoundError');
                        ct++;
                        return s.count(nonexistentStore);
                    }).catch(function (err) {
                        expect(err.name).to.equal('NotFoundError');
                        ct++;
                        return s.query(nonexistentStore).all().execute();
                    }).catch(function (err) {
                        expect(err.name).to.equal('NotFoundError');
                        expect(ct).to.equal(6);
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
            it('should catch bad indexes', function (done) {
                db.open({server: this.dbName}).then(function (s) {
                    s.names.query('nonexistentIndex').all().execute().catch(function (err) {
                        expect(err.name).to.equal('NotFoundError');
                        done();
                    });
                });
            });
            it('should catch bad limit arguments', function (done) {
                db.open({server: this.dbName}).then(function (s) {
                    s.names.query().all().limit('bad', 'limit', 'args').execute().catch(function (err) {
                        expect(err.message).to.equal('limit() arguments must be numeric');
                        done();
                    });
                });
            });
            it('should catch bad modify() arguments', function (done) {
                db.open({server: this.dbName}).then(function (s) {
                    s.names.query().all().modify({badModifier: function () {
                        return function badModifiedResult () {};
                    }}).execute().catch(function (err) {
                        expect(err.name).to.equal('DataCloneError');
                        done();
                    });
                });
            });
            it('should catch bad range keys (on cursor)', function (done) {
                var ct = 0;
                db.open({server: this.dbName}).then(function (s) {
                    s.names.query().range({badKey: ''}).execute().catch(function (err) {
                        expect(err.message).to.have.string('is not a valid key');
                        ct++;
                        return s.names.query().only(null).execute();
                    }).catch(function (err) {
                        expect(err.name).to.equal('DataError');
                        ct++;
                        return s.names.query().only(null).keys().execute();
                    }).catch(function (err) {
                        expect(err.name).to.equal('DataError');
                        ct++;
                        return s.names.query().only(null).count().execute();
                    }).catch(function (err) {
                        expect(err.name).to.equal('DataError');
                        expect(ct).to.equal(3);
                        s.close();
                        done();
                    });
                });
            });
            it('should catch bad filters (with add)', function (done) {
                db.open({server: this.dbName}).then(function (s) {
                    var caught = false;
                    s.names.add(null).then(function () {
                        s.names.query().filter('name', 'Alex').execute().catch(function (err) {
                            expect(err.name).to.equal('TypeError');
                            caught = true;
                            return s.names.query().filter(function () {
                                throw new Error('Bad filter function');
                            }).execute();
                        }).catch(function (err) {
                            expect(caught).to.equal(true);
                            expect(err.name).to.equal('Error');
                            s.close();
                            done();
                        });
                    });
                });
            });
            it('should catch bad filters (with update)', function (done) {
                db.open({server: this.dbName}).then(function (s) {
                    var caught = false;
                    s.names.update(null).then(function () {
                        s.names.query().filter('name', 'Alex').execute().catch(function (err) {
                            expect(err.name).to.equal('TypeError');
                            caught = true;
                            return s.names.query().filter(function () {
                                throw new Error('Bad filter function');
                            }).execute();
                        }).catch(function (err) {
                            expect(caught).to.equal(true);
                            expect(err.name).to.equal('Error');
                            s.close();
                            done();
                        });
                    });
                });
            });
        });

        describe('delete', function () {
            it('should catch bad args', function (done) {
                var spec = this;
                var caught = false;
                db.open({server: this.dbName}).then(function (s) {
                    db.delete(spec.dbName).catch(function (err) { // Other arguments (or missing arguments) do not throw
                        expect(err.type).to.equal('blocked');
                        s.close();
                        caught = true;
                        return err.resume;
                    }).then(function () {
                        expect(caught).to.be.true;
                        done();
                    });
                });
            });
        });

        describe('cmp', function () {
            it('cmp: should catch bad args', function (done) {
                db.cmp(key1, null).catch(function (err) {
                    expect(err.name).to.equal('DataError');
                    done();
                });
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
