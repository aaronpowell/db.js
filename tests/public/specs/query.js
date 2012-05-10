(function ( db , describe , it , runs , expect , waitsFor , beforeEach , afterEach ) {
    'use strict';
    
    describe( 'query' , function () {
        var server,
            dbName = 'my-test-db',
            indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;
           
       beforeEach( function () {
            var done = false;
            
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
            
            runs( function () {
                db.open( dbName , 1 , function ( s ) {
                    server = s;
                } , { 
                    test: {
                        key: {
                            keyPath: 'id',
                            autoIncrement: true
                        }
                    }
                });
            });
            
            waitsFor( function () { 
                return !!server;
            } , 'wait on db' , 500 );
        });


        it( 'should allow getting by id' , function () {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            runs( function () {
                server.add( 'test' , item , function ( x ) {
                    item = x;
                });
            });

            waitsFor( function () {
                return !!~~item.id;
            } , 'timed out waiting add' , 1000 );

            runs( function () {
                server.get( 'test' , item.id , function ( x ) {
                    expect( x ).toBeDefined();
                    expect( x.id ).toEqual( item.id );
                    expect( x.firstName ).toEqual( item.firstName );
                    expect( x.lastName ).toEqual( item.lastName );
                })
            })
        });
    });
})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach );