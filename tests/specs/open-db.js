(function ( db , describe , it , expect , beforeEach , afterEach ) {
    'use strict';
    describe( 'db.open' , function () {
        var dbName = 'tests',
          indexedDB = db.indexedDB;

        beforeEach( function (done) {
            db.remove(dbName).then(done, function(err) {
                console.log( 'failed to delete db' , arguments );
                done(err);
            });
        }, 10000);
        
        afterEach( function (done) {
            if ( this.server ) {
                this.server.close();
            }
            db.remove(dbName).then(done, function(err) {
                console.log( 'failed to delete db' , arguments );
                done(err);
            });
        });
        
        it( 'should open a new instance successfully' , function (done) {
            var spec = this;
            db.open( {
                server: dbName ,
                version: 1
            }).then( function ( s ) {
                spec.server = s;
                expect( spec.server ).toBeDefined(); 
                done();
            });
        });
        
        it( 'should use the provided schema' , function (done) {
            var spec = this;

            db.open( {
                server: dbName,
                version: 1,
                schema: { 
                    test: {
                        key: {
                            keyPath: 'id',
                            autoIncrement: true
                        },
                        indexes: {
                          x: {},
                        }
                    }
                }
            }).then(function ( s ) {
              s.close();
              var req = indexedDB.open( dbName );
              req.onsuccess = function ( e ) {
                var db = e.target.result;
                
                expect( db.objectStoreNames.length ).toEqual( 1 );
                expect( db.objectStoreNames[ 0 ] ).toEqual( 'test' );
                
                db.close();
                done();
              };
            },function (err) {
              console.log(err);
              done(err);
            });
        });

        it( 'should allow schemas without keypaths' , function (done) {
            var spec = this;

            db.open( {
                server: dbName ,
                version: 1,
                schema: { 
                    test: {
                    }
                }
            }).then(function ( s ) {
                s.close();
                var req = indexedDB.open( dbName );
                req.onsuccess = function ( e ) {
                    var db = e.target.result;
                    
                    expect( db.objectStoreNames.length ).toEqual( 1 );
                    expect( db.objectStoreNames[ 0 ] ).toEqual( 'test' );
                    
                    db.close();
                    done();
                };
            },function (err) {
              done(err);
            });
        });

        it( 'should upgrade when db newly created or version changed' , function (done) {
            var upgraded = undefined;
            db.open( {
                server: dbName,
                version: 1,
                schema: { 
                    test: {}
                },
                upgrade: function(e) {
                  upgraded = true;
                }
            }).then(function ( s ) {
                s.close();
                expect(upgraded).toBe(true, 'schema migration failed');
                upgraded = undefined;
                next();
            });
            function next() {
                db.open( {
                  server: dbName,
                  version: 2,
                  schema: { 
                      wow: {}
                  },
                  upgrade: function(e) {
                    upgraded = true;
                  }
                }).then(function ( s ) {
                    expect(upgraded).toBe(true, 'schema migration failed');
                    s.close();
                    done();
                });
            }
        });

        it( 'should error when delete non closed db', function(done) {
            function removeFinish(e) {
              expect(!!e).toBe(true, 'error expected');
              done(e);
            }
            var spec = this;
            db.open( {
                server: dbName,
                version: 1,
                schema: { 
                    test: {}
                }
            }).then(function ( s ) {
              spec.server = s;
              db.remove(dbName).then(function() {
                removeFinish();
              }, removeFinish);
            });
        });

        it( 'should skip creating existing object stores when migrating schema' , function (done) {
            var migrated = undefined;

            db.open( {
                server: dbName,
                version: 1,
                schema: { 
                    test: {}
                }
            }).then(function ( s ) {
                s.close();
                function migrated(ret) {
                  expect(ret).toBe(true, 'schema migration failed');
                  done();
                }
                db.open( {
                    server: dbName,
                    version: 2,
                    schema: { 
                        test: {},
                        extra: {}
                    }
                }).then(function ( s ) {
                    s.close();
                    migrated(true);
                },function (err) {
                    migrated(false);
                });
            },function (err) {
              done(err);
            });
        });
    });
})( window.db , window.describe , window.it , window.expect , window.beforeEach , window.afterEach );
