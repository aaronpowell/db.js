(function ( db , describe , it , runs , expect , waitsFor , beforeEach , afterEach ) {
    'use strict';
    
    describe( 'server.add' , function () {
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
           
        it( 'should insert a new item into the object store' , function () {
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
            
            runs( function () {
                expect( item.id ).toBeDefined();
                expect( item.id ).toEqual( 1 );
            });
        });
        
        it( 'should insert multiple records' , function () {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'John',
                lastName: 'Smith'
            };
            
            var spec = this;
            
            runs( function () {
                spec.server.add( 'test' , [ item1 , item2 ] ).done( function ( items ) {
                    item1.id = items[ 0 ].id;
                    item2.id = items[ 1 ].id;
                });
            });
            
            waitsFor( function () {
                return typeof item1.id !== 'undefined';
            } , 'timed out waiting for items to be added' , 1000 );
            
            runs( function () {
                expect( item1.id ).toBeDefined();
                expect( item1.id ).toEqual( 1 );
                expect( item2.id ).toBeDefined();
                expect( item2.id ).toEqual( 2 );
            });
        });
    });

})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach );