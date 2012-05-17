(function ( db , describe , it , runs , expect , waitsFor , beforeEach , afterEach ) {
    'use strict';
    
    describe( 'query' , function () {
        var dbName = 'tests',
            indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;
           
       beforeEach( function () {
            var done = false;

            var spec = this;
            
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

        it( 'should allow getting by id' , function () {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            runs( function () {
                this.server.add( 'test' , item ).done( function ( x ) {
                    item = x[0];
                });
            });

            waitsFor( function () {
                return !!~~item.id;
            } , 'timed out waiting add' , 1000 );

            var done = false;
            runs( function () {
                this.server.get( 'test' , item.id ).done( function ( x ) {
                    expect( x ).toBeDefined();
                    expect( x.id ).toEqual( item.id );
                    expect( x.firstName ).toEqual( item.firstName );
                    expect( x.lastName ).toEqual( item.lastName );
                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out waiting for asserts' );
        });

        it( 'should allow a get all operation' , function () {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'John',
                lastName: 'Smith'
            };

            var done = false;

            runs( function () {
                this.server.add( 'test' , [ item1 , item2 ] ).done( function () {
                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out adding record' );

            runs( function () {
                done = false;
                this.server.query( 'test' ).execute().done( function ( results ) {
                    expect( results ).toBeDefined();
                    expect( results.length ).toEqual( 2 );
                    expect( results[0].firstName ).toEqual( item1.firstName );
                    expect( results[1].firstName ).toEqual( item2.firstName );

                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running expects' );
        });

        it( 'should query against a single property' , function () {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'John',
                lastName: 'Smith'
            };
            var item3 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            var done = false;

            runs( function () {
                this.server.add( 'test' , [ item1 , item2 , item3 ] ).done( function () {
                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out adding record' );

            runs( function () {
                done = false;
                this.server
                    .query( 'test' )
                    .filter('firstName', 'Aaron')
                    .execute()
                    .done( function ( results ) {
                        expect( results ).toBeDefined();
                        expect( results.length ).toEqual( 2 );
                        expect( results[0].firstName ).toEqual( item1.firstName );
                        expect( results[1].firstName ).toEqual( item3.firstName );

                        done = true;
                    });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running expects' );
        });

        it( 'should query using a function filter' , function () {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'John',
                lastName: 'Smith'
            };
            var item3 = {
                firstName: 'Aaron',
                lastName: 'Smith'
            };

            var done = false;

            runs( function () {
                this.server.add( 'test' , [ item1 , item2 , item3 ] ).done( function () {
                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out adding record' );

            runs( function () {
                done = false;
                this.server
                    .query( 'test' )
                    .filter( function ( x ) {
                        return x.firstName === 'Aaron' && x.lastName === 'Powell'
                    })
                    .execute()
                    .done(function ( results ) {
                        expect( results ).toBeDefined();
                        expect( results.length ).toEqual( 1 );
                        expect( results[0].firstName ).toEqual( item1.firstName );
                        expect( results[0].firstName ).toEqual( item1.firstName );

                        done = true;
                    });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running expects' );
        });
    });
})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach );