(function ( db , describe , it , runs , expect , waitsFor , beforeEach , afterEach ) {
    'use strict';
    
    describe( 'server.remove' , function () {
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
            
            runs( function () {
                db.open( {
                    server: dbName ,
                    version: 1 ,
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
        
        it( 'should remove an added item' , function () {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            
            runs( function () {
                spec.server.add( 'test' , item ).done( function ( records ) {
                    item = records[0];
                });
            });
            
            waitsFor( function () {
                return typeof item.id !== 'undefined';
            } , 'timeout waiting for item to be added' , 1000 );

            var done = false;
            runs( function () {
                spec.server.remove( 'test' , item.id ).done(function () {
                    spec.server.get( 'test' , item.id ).done( function ( x ) {
                        expect( x ).toEqual( undefined );

                        done = true;
                    });
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running expects' );
        });

        it( 'should remove all items from a table' , function () {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Andrew',
                lastName: 'Lyon'
            };
            
            var spec = this;
            var done = false;

            runs( function () {
                spec.server.add( 'test' , item , item2 ).done( function ( records ) {
                    done = true;
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for items to be added' , 1000 );

            var done = false;
            runs( function () {
                spec.server.clear( 'test' ).done(function () {
                    spec.server.query( 'test' ).all().execute().done( function ( r ) {
                        expect( r.length ).toEqual( 0 );

                        done = true;
                    });
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running expects' );
        });
    });

})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach );
