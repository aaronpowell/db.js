(function ( db , describe , it , expect , beforeEach , afterEach ) {
    'use strict';
    describe( 'db.open' , function () {
        var dbName = 'tests',
            indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach( function (done) {

            var req = indexedDB.deleteDatabase( dbName );
            
            req.onsuccess = function () {
                done();
            };
            
            req.onerror = function (e) {
                console.log( 'error deleting db' , arguments );
                done(e);
            };
            
            req.onblocked = function (e) {
                console.log( 'db blocked on delete' , arguments );
                done(e);
            };
        }, 10000);
        
        afterEach( function (done) {
            if ( this.server ) {
                this.server.close();
            }                
            var req = indexedDB.deleteDatabase( dbName );
            
            req.onsuccess = function (e) {
              done();
            };
            
            req.onerror = function (e) {
                console.log( 'failed to delete db' , arguments );
                done(e);
            };
            
            req.onblocked = function (e) {
                console.log( 'db blocked' , arguments );
                done(e);
            };
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
