(function ( db , describe , it , runs , expect , waitsFor , beforeEach , afterEach ) {
    'use strict';
    
    describe( 'db.indexes' , function () {
        var dbName = 'tests',
            indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;
           
       beforeEach( function () {
            var done = false;
            var spec = this;
            
            spec.server = undefined;
            
            runs( function () {
                var req = indexedDB.deleteDatabase( dbName );
                
                req.onsuccess = function () {
                    done = true;
                };
                
                req.onerror = function () {
                    console.log( 'failed to delete db' , arguments );
                };
                
                req.onblocked = function () {
                    console.log( 'db blocked' , arguments , spec );
                };
            });
            
            waitsFor( function () {
                 return done;
            }, 'timed out deleting the database', 1000);
        });
        
        afterEach( function () {
            var done;

            runs( function () {
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
        
        it( 'should allow creating dbs with indexes' , function () {
            var spec = this;
            runs( function () {
                db.open( {
                    server: dbName ,
                    version: 1 , 
                    done: function ( s ) {
                        spec.server = s;
                    } ,
                    schema: { 
                        test: {
                            key: {
                                keyPath: 'id',
                                autoIncrement: true
                            },
                            indexes: {
                                firstName: { }
                            }
                        }
                    }
                });
            });

            waitsFor( function () {
                return !!spec.server;
            } , 1000 , 'timed out opening the db' );

            var done = false;
            runs( function () {
                spec.server.close();

                var req = indexedDB.open( dbName , 1 );
                req.onsuccess = function ( e ) {
                    var res = e.target.result;

                    var transaction = res.transaction( 'test' );
                    var store = transaction.objectStore( 'test' );

                    expect( store.indexNames.length ).toEqual( 1 );
                    expect( store.indexNames[ 0 ] ).toEqual( 'firstName' );

                    res.close();
                    done = true;
                };
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running specs' );
        });
    });

})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach );