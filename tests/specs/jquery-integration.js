(function ( db , describe , it , runs , expect , waitsFor , beforeEach , afterEach , $ ) {
    'use strict';
    
    describe( 'jQuery deferred integration' , function () {
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
                    console.log( 'failed to delete db in beforeEach' , arguments );
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

            runs( function () {
                done = false;

                spec.server
                    .test
                    .add({
                        firstName: 'Aaron',
                        lastName: 'Powell'
                    })
                    .done(function () {
                        done = true;
                    });
            });

            waitsFor( function () {
                return done;
            } , 'adding record' , 500 );
        });
        
        afterEach( function () {
            var done;

            runs( function () {
                if ( this.server ) {
                    this.server.close();
                }

                var spec = this;

                var req = indexedDB.deleteDatabase( dbName );

                req.onsuccess = function () {
                    done = true;
                };
                
                req.onerror = function () {
                    console.log( 'failed to delete db in afterEach' , arguments , spec );
                };
                
                req.onblocked = function () {
                    console.log( 'db blocked' , arguments );
                };
            });
            
            waitsFor( function () {
                 return done;
            }, 'timed out deleting the database', 1000);
        });

        it( 'should chain against other jQuery deferred operations' , function () {
            var done;

            runs( function () {
                var ajaxDeferred = $.getJSON( 'foo' );
                var queryDeferred = this
                    .server
                    .test
                    .query()
                    .all()
                    .execute();

                $.when( ajaxDeferred , queryDeferred )
                    .done(function ( ajaxData , queryData ) {
                        done = true;
                        expect( ajaxData ).toBeDefined();
                        expect( ajaxData[ 0 ] ).toEqual({
                            firstName: 'John',
                            lastName: 'Smith'
                        });

                        expect( queryData ).toBeDefined();
                        expect( queryData.length ).toBe( 1 );
                        expect( queryData[ 0 ].firstName ).toBe( 'Aaron' );
                        expect( queryData[ 0 ].lastName ).toBe( 'Powell' );
                    })
            });

            waitsFor( function () {
                return done;
            } , 'deferred to return' , 1000 );
        });
    });
})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach , window.jQuery );