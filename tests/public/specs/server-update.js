(function ( db , describe , it , runs , expect , waitsFor , beforeEach , afterEach ) {
    'use strict';
    
    describe( 'server.update' , function () {
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

        it( 'should update the item after it is added' , function () {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            var done;
            
            runs( function () {
                spec.server.add( 'test' , item ).done( function ( records ) {
                    done = true;
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for item to be added' , 1000 );
            
            runs( function () {
                done = false;
                item.firstName = 'John';
                item.lastName = 'Smith';

                spec.server
                    .test
                    .update( item )
                    .done( function ( records ) {
                        done = true;
                    });
            });

            waitsFor(function () {
                return done;
            } , 'timed out waiting for update' , 1000 );

            runs( function () {
                done = false;

                spec.server
                    .test
                    .get( item.id )
                    .done( function ( record ) {
                        done = true;

                        expect( record ).toBeDefined();
                        expect( record.id ).toBe( item.id );
                        expect( record.firstName ).toBe( item.firstName );
                        expect( record.lastName ).toBe( item.lastName );
                        expect( record ).not.toBe( item );
                    });
            });

            waitsFor(function () {
                return done;
            } , 'timed out waiting for get' , 1000 );

        });

        it( 'should allow updating of multiple items' , function () {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Bob',
                lastName: 'Down'
            };
            
            var spec = this;
            var done;

            runs( function () {
                spec.server.add( 'test' , item , item2 ).done( function ( records ) {
                    done = true;
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for item to be added' , 1000 );
            
            var done;

            runs( function () {
                done = false;

                item.firstName = 'John';
                item.lastName = 'Smith';

                item2.firstName = 'Billy';
                item2.lastName = 'Brown';

                spec.server
                    .test
                    .update( item , item2 )
                    .done( function ( records ) {
                        done = true;
                    });
            });

            waitsFor(function () {
                return done;
            } , 'timed out waiting for update' , 1000 );

            runs( function () {
                done = false;

                spec.server
                    .test
                    .query()
                    .all()
                    .execute()
                    .done( function ( records ) {
                        done = true;

                        expect( records.length ).toBe( 2 );

                        var record = records[0];
                        expect( record ).toBeDefined();
                        expect( record.id ).toBe( item.id );
                        expect( record.firstName ).toBe( item.firstName );
                        expect( record.lastName ).toBe( item.lastName );
                        expect( record ).not.toBe( item );

                        record = records[1];
                        expect( record ).toBeDefined();
                        expect( record.id ).toBe( item2.id );
                        expect( record.firstName ).toBe( item2.firstName );
                        expect( record.lastName ).toBe( item2.lastName );
                        expect( record ).not.toBe( item2 );
                    });
            });

            waitsFor(function () {
                return done;
            } , 'timed out waiting for get' , 1000 );
        });

    });

    describe( 'server.update-custom-keys' , function () {
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

        it( 'should allow updating with custom keys' , function () {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var key = 'foo';
            
            var spec = this;
            var done;

            runs( function () {
                spec.server
                .add( 'test' , {
                        item: item,
                        key: key
                    })
                .done( function ( records ) {
                    done = true;
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for item to be added' , 1000 );
            
            var done;

            runs( function () {
                done = false;

                item.firstName = 'John';
                item.lastName = 'Smith';

                spec.server
                    .test
                    .update( {
                        item: item,
                        key: key
                    } )
                    .done( function ( records ) {
                        done = true;
                    });
            });

            waitsFor(function () {
                return done;
            } , 'timed out waiting for update' , 1000 );

            runs( function () {
                done = false;

                spec.server
                    .test
                    .query()
                    .all()
                    .execute()
                    .done( function ( records ) {
                        done = true;

                        expect( records.length ).toBe( 1 );

                        var record = records[0];
                        expect( record ).toBeDefined();
                        expect( record.__id__ ).toBe( key );
                        expect( record.firstName ).toBe( item.firstName );
                        expect( record.lastName ).toBe( item.lastName );
                        expect( record ).not.toBe( item );
                    });
            });

            waitsFor(function () {
                return done;
            } , 'timed out waiting for get' , 1000 );
        });
    });

})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach );