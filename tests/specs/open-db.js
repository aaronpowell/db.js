/*global window, console, guid */
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('db.open', function () {
        this.timeout(5000);

        var initialVersion = 1;
        var newVersion = 2;
        var indexedDB = window.indexedDB || window.webkitIndexedDB ||
            window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            this.dbName = guid();
            done();
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

        it('should open a new instance successfully', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: initialVersion
            }).then(function (s) {
                spec.server = s;
                expect(spec.server).to.not.be.undefined;
                done();
            });
        });

        it('should normally reject open promise with store conflicting with Server methods', function (done) {
            db.open({
                server: this.dbName,
                version: initialVersion,
                schema: {
                    query: {
                        key: {
                            keyPath: 'id'
                        }
                    }
                }
            }).catch(function (err) {
                expect(err.toString()).to.contain('conflicts with db.js method');
                done();
            });
        });

        it('should not add stores to server using noServerMethods', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: initialVersion,
                noServerMethods: true,
                schema: {
                    test: {
                        key: {
                            keyPath: 'id'
                        }
                    },
                    query: {
                        key: {
                            keyPath: 'id'
                        }
                    }
                }
            }).then(function (s) {
                spec.server = s;
                expect(spec.server.test).to.be.undefined;
                expect(spec.server.query).to.be.function;
                done();
            });
        });

        it('should use the provided schema', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: initialVersion,
                schema: {
                    test: {
                        key: {
                            keyPath: 'id',
                            autoIncrement: true
                        },
                        indexes: {
                            x: {}
                        }
                    }
                }
            }).then(function (s) {
                s.close();
                var req = indexedDB.open(spec.dbName);
                req.onsuccess = function (e) {
                    var db = e.target.result;

                    expect(db.objectStoreNames.length).to.equal(1);
                    expect(db.objectStoreNames[ 0 ]).to.equal('test');

                    db.close();
                    done();
                };
            }, function (err) {
                console.log(err);
                done(err);
            });
        });

        it('should allow schemas without keypaths', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: initialVersion,
                schema: {
                    test: {}
                }
            }).then(function (s) {
                s.close();
                var req = indexedDB.open(spec.dbName);
                req.onsuccess = function (e) {
                    var db = e.target.result;

                    expect(db.objectStoreNames.length).to.equal(1);
                    expect(db.objectStoreNames[ 0 ]).to.equal('test');

                    db.close();
                    done();
                };
            }, function (err) {
                done(err);
            });
        });

        it('should skip creating existing object stores when migrating schema', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: initialVersion,
                schema: {
                    test: {}
                }
            }).then(function (s) {
                s.close();
                function migrated (ret) {
                    expect(ret).to.equal(true, 'schema migration failed');
                    done();
                }
                db.open({
                    server: spec.dbName,
                    version: newVersion,
                    schema: {
                        test: {},
                        extra: {}
                    }
                }).then(function (s) {
                    s.close();
                    migrated(true);
                }, function (/* err */) {
                    migrated(false);
                });
            }, function (err) {
                done(err);
            });
        });

        it('should remove object stores no longer defined in the schema', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: initialVersion,
                schema: {
                    test_1: {},
                    test_2: {}
                }
            }).then(function (s) {
                s.close();

                db.open({
                    server: spec.dbName,
                    version: newVersion,
                    schema: {
                        test_2: {}
                    }
                }).then(function (s) {
                    s.close();

                    var req = indexedDB.open(spec.dbName);
                    req.onsuccess = function (e) {
                        var db = e.target.result;

                        expect(db.objectStoreNames.length).to.equal(1);
                        expect(db.objectStoreNames[ 0 ]).to.equal('test_2');

                        db.close();
                        done();
                    };
                }, function (err) {
                    done(err);
                });
            }, function (err) {
                done(err);
            });
        });
    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
