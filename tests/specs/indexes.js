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
                    console.log( 'failed to delete db in beforeEach' , arguments );
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
        
        it( 'should allow creating dbs with indexes' , function () {
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
                            },
                            indexes: {
                                firstName: { },
                                age: { }
                            }
                        }
                    }
                }).then(function ( s ) {
                    spec.server = s;
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
                    var indexNames = Array.prototype.slice.call( store.indexNames );

                    expect( indexNames.length ).toEqual( 2 );
                    expect( indexNames ).toContain( 'firstName' );
                    expect( indexNames ).toContain( 'age' );

                    spec.server = res;
                    done = true;
                };
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running specs' );
        });

        it( 'should allow adding indexes to an existing object store' , function () {
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
                            },
                        }
                    }
                }).then(function ( s ) {
                    s.close();
					
                    db.open( {
                        server: dbName,
                        version: 2,
						schema: { 
							test: {
								key: {
									keyPath: 'id',
									autoIncrement: true
								},
								indexes: {
									firstName: { },
									age: { }
								}
							}
						}
                    }).then(function ( s ) {
						spec.server = s;
                    });
                });
            });

            waitsFor( function () {
                return !!spec.server;
            } , 1000 , 'timed out opening the db' );
			
            var done = false;
            runs( function () {
                spec.server.close();

                var req = indexedDB.open( dbName , 2 );
                req.onsuccess = function ( e ) {
                    var res = e.target.result;

                    var transaction = res.transaction( 'test' );
                    var store = transaction.objectStore( 'test' );
                    var indexNames = Array.prototype.slice.call( store.indexNames );

                    expect( indexNames.length ).toEqual( 2 );
                    expect( indexNames ).toContain( 'firstName' );
                    expect( indexNames ).toContain( 'age' );

                    spec.server = res;
                    done = true;
                };
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running specs' );
        });

        it( 'should allow adding indexes to an existing object store with indexes' , function () {
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
                            },
                            indexes: {
                                firstName: {}
                            }
                        }
                    }
                }).then(function ( s ) {
                    s.close();
                    
                    db.open( {
                        server: dbName,
                        version: 2,
                        schema: { 
                            test: {
                                key: {
                                    keyPath: 'id',
                                    autoIncrement: true
                                },
                                indexes: {
                                    firstName: { },
                                    age: { }
                                }
                            }
                        }
                    }).then(function ( s ) {
                        spec.server = s;
                    });
                });
            });

            waitsFor( function () {
                return !!spec.server;
            } , 1000 , 'timed out opening the db' );
            
            var done = false;
            runs( function () {
                spec.server.close();

                var req = indexedDB.open( dbName , 2 );
                req.onsuccess = function ( e ) {
                    var res = e.target.result;

                    var transaction = res.transaction( 'test' );
                    var store = transaction.objectStore( 'test' );
                    var indexNames = Array.prototype.slice.call( store.indexNames );

                    expect( indexNames.length ).toEqual( 2 );
                    expect( indexNames ).toContain( 'firstName' );
                    expect( indexNames ).toContain( 'age' );

                    spec.server = res;
                    done = true;
                };
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running specs' );
        });
		});

})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach );
