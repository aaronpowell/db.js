/*global window, console*/
/*jslint vars:true*/
(function ( db , describe , it , expect , beforeEach , afterEach ) {
    'use strict';
    
    describe( 'server.remove' , function () {
        var dbName = 'tests',
            indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;
           
       beforeEach( function (done) {
            var spec = this;
            
            spec.server = undefined;
            
            var req = indexedDB.deleteDatabase( dbName );
            
            req.onsuccess = function () {
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
                }).then(function ( s ) {
                    spec.server = s;
                    expect(spec.server).toBeTruthy();
                    done();
                });
            };
            
            req.onerror = function () {
                console.log( 'failed to delete db' , arguments );
            };
            
            req.onblocked = function () {
                console.log( 'db blocked' , arguments , spec );
            };
        });
        
        afterEach( function (done) {
            if ( this.server ) {
                this.server.close();
            }
            var req = indexedDB.deleteDatabase( dbName );
            
            req.onsuccess = function () {
                done();
            };
            
            req.onerror = function () {
                console.log( 'failed to delete db' , arguments );
            };
            
            req.onblocked = function () {
                console.log( 'db blocked' , arguments );
            };
        });
        
        it( 'should remove an added item' , function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            
            spec.server.add( 'test' , item ).then( function ( records ) {
                item = records[0];
                expect(item.id).toBeDefined();
                spec.server.remove( 'test' , item.id ).then(function () {
                    spec.server.get( 'test' , item.id ).then( function ( x ) {
                        expect( x ).toEqual( undefined );

                        done();
                    });
                });
            });
        });

        it( 'should remove all items from a table' , function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Andrew',
                lastName: 'Lyon'
            };
            
            var spec = this;
            spec.server.add( 'test' , item , item2 ).then( function ( /*records*/ ) {
                spec.server.clear( 'test' ).then(function () {
                    spec.server.query( 'test' ).all().execute().then( function ( r ) {
                        expect( r.length ).toEqual( 0 );
                        done();
                    });
                });
            });
        });
    });

}( window.db , window.describe , window.it , window.expect , window.beforeEach , window.afterEach ));
