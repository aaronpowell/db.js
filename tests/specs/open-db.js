(function ( db , describe , it , runs , expect , waitsFor , beforeEach , afterEach ) {
    'use strict';
    describe( 'db.open' , function () {
        var dbName = 'tests',
            indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;
        
        beforeEach( function () {
            var done = false;

            runs( function () {
                var req = indexedDB.deleteDatabase( dbName );
                
                req.onsuccess = function () {
                    done = true;
                };
                
                req.onerror = function () {
                    console.log( 'error deleting db' , arguments );
                };
                
                req.onblocked = function () {
                    console.log( 'db blocked on delete' , arguments );
                };
            });
            
            waitsFor( function () {
                 return done;
            }, 'timed out deleting the database', 1000);
        });
        
        afterEach( function () {
            var done;

            runs( function () {
                if ( this.server ) {
                    this.server.close();
                }                
                var req = indexedDB.deleteDatabase( dbName );
                
                req.onsuccess = function () {
                    done = true;
                };
                
                req.onerror = function () {
                    console.log( 'failed to delete db' , arguments );
                };
                
                req.onblocked = function () {
                    console.log( 'db blocked' , arguments );
                };
            });
            
            waitsFor( function () {
                 return done;
            }, 'timed out deleting the database', 1000);
        });
        
        it( 'should open a new instance successfully' , function () {
            var spec = this;
            runs( function () {
                db.open( {
                    server: dbName ,
                    version: 1
                }).done( function ( s ) {
                    spec.server = s;
                });
            });
            
            waitsFor( function () { 
                return !!spec.server;
            } , 'wait on db' , 500 );
            
            runs( function () {
               expect( spec.server ).toBeDefined(); 
            });
        });
        
        it( 'should use the provided schema' , function () {
            var done = false;
            var spec = this;

            runs( function () {
                db.open( {
                    server: dbName ,
                    version: 1,
                    schema: { 
                        test: {
                            key: {
                                keyPath: 'id',
                                autoIncrement: true
                            }
                        }
                    }
                }).done(function ( s ) {
                    spec.server = s;
                });
            });
            
            waitsFor( function () { 
                return !!spec.server;
            } , 'wait on db' , 500 );
            
            runs( function () {
                var req = indexedDB.open( dbName );
                req.onsuccess = function ( e ) {
                    var db = e.target.result;
                    
                    expect( db.objectStoreNames.length ).toEqual( 1 );
                    expect( db.objectStoreNames[ 0 ] ).toEqual( 'test' );
                    
                    db.close();
                    done = true;
                };
            });
            
            waitsFor( function () {
                return done;
            } , 'timed out on expectations' , 1000 );
        });

        it( 'should allow schemas without keypaths' , function () {
            var done = false;
            var spec = this;

            runs( function () {
                db.open( {
                    server: dbName ,
                    version: 1,
                    schema: { 
                        test: {
                        }
                    }
                }).done(function ( s ) {
                    spec.server = s;
                });
            });
            
            waitsFor( function () { 
                return !!spec.server;
            } , 'wait on db' , 500 );
            
            runs( function () {
                var req = indexedDB.open( dbName );
                req.onsuccess = function ( e ) {
                    var db = e.target.result;
                    
                    expect( db.objectStoreNames.length ).toEqual( 1 );
                    expect( db.objectStoreNames[ 0 ] ).toEqual( 'test' );
                    
                    db.close();
                    done = true;
                };
            });
            
            waitsFor( function () {
                return done;
            } , 'timed out on expectations' , 1000 );
        });

        it( 'should skip creating existing object stores when migrating schema' , function () {
            var migrated = undefined;

            runs( function () {
                db.open( {
                    server: dbName,
                    version: 1,
                    schema: { 
                        test: {}
                    }
                }).done(function ( s ) {
                    s.close();

                    db.open( {
                        server: dbName,
                        version: 2,
                        schema: { 
                            test: {},
                            extra: {}
                        }
                    }).done(function ( s ) {
                        s.close();
                        migrated = true;
                    }).fail(function () {
                        migrated = false;
                    });
                });
            });

            waitsFor( function () {
                return migrated !== undefined;
            } , 'timed out on expectations' , 1000 );

            runs( function () {
              expect(migrated).toBe(true, 'schema migration failed');
            })
        });
    });
})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach );
