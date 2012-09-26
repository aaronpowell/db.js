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
                }).done(function ( s ) {
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
    });

    describe( 'index.query' , function () {
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
                }).done(function ( s ) {
                    spec.server = s;
                });
            });

            waitsFor( function () {
                return !!spec.server;
            } , 1000 , 'timed out opening the db' );

            runs( function () {
                done = false;
                var item1 = {
                    firstName: 'Aaron',
                    lastName: 'Powell',
                    age: 20
                };
                var item2 = {
                    firstName: 'John',
                    lastName: 'Smith',
                    age: 30
                };
                var item3 = {
                    firstName: 'Aaron',
                    lastName: 'Smith',
                    age: 40
                };
                spec.server.add( 'test' , [ item1 , item2 , item3 ] ).done( function () {
                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out adding entries' );
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
        
        it( 'should allow matching exact values' , function () {
            var spec = this;
            var done;
            runs( function () {
                spec.server.index( 'test' , 'firstName' ).only( 'Aaron' ).done( function ( results ) {
                    expect( results.length ).toEqual( 2 );
                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running specs for \'only\'' );
        });

        it( 'should allow matching on a lower bound range' , function () {
            var spec = this;
            var done;
            runs( function () {
                spec.server.index( 'test' , 'age' ).lowerBound( 30 ).done( function ( results ) {
                    expect( results.length ).toEqual( 2 );
                    expect( results[0].age ).toEqual( 30 );
                    expect( results[1].age ).toEqual( 40 );
                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running specs for \'lowerBound\'' );
        });

        it( 'should allow matching on an upper bound range' , function () {
            var spec = this;
            var done;
            runs( function () {
                spec.server.index( 'test' , 'age' ).upperBound( 30, true ).done( function ( results ) {
                    expect( results.length ).toEqual( 1 );
                    expect( results[0].age ).toEqual( 20 );
                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running specs for \'upperBound\'' );
        });

        it( 'should allow matching across a whole bound range with inclusive limits', function () {
            var spec = this;
            var done;
            runs( function () {
                spec.server.index( 'test' , 'age' ).bound( 20, 40, false, false ).done( function ( results ) {
                    expect( results.length ).toEqual( 3 );
                    expect( results[0].age ).toEqual( 20 );
                    expect( results[1].age ).toEqual( 30 );
                    expect( results[2].age ).toEqual( 40 );
                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running specs for \'bound\'' );
        });

        it( 'should allow matching across a whole bound range with exclusive limits', function () {
            var spec = this;
            var done;
            runs( function () {
                spec.server.index( 'test' , 'age' ).bound( 20, 40, true , true ).done( function ( results ) {
                    expect( results.length ).toEqual( 1 );
                    expect( results[0].age ).toEqual( 30 );
                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running specs for \'bound\'' );
        });

        it( 'should allow matching across a whole bound range with mixed limits', function () {
            var spec = this;
            var done;
            runs( function () {
                spec.server.index( 'test' , 'age' ).bound( 20, 40, false, true ).done( function ( results ) {
                    expect( results.length ).toEqual( 2 );
                    expect( results[0].age ).toEqual( 20 );
                    expect( results[1].age ).toEqual( 30 );
                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running specs for \'bound\'' );
        });

        describe( 'index.count' , function () {
            it( 'should allow an only query to return just a count' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.index( 'test' , 'firstName' ).count.only( 'Aaron' ).done( function ( results ) {
                        expect( results ).toEqual( 2 );
                        done = true;
                    });
                });

                waitsFor( function () {
                    return done;
                } , 1000 , 'timed out running specs for \'count.only\'' );
            });

            it( 'should allow a bound query to return just a count' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.index( 'test' , 'age' ).count.bound( 20 , 40 , false , false ).done( function ( results ) {
                        expect( results ).toEqual( 3 );
                        done = true;
                    });
                });

                waitsFor( function () {
                    return done;
                } , 1000 , 'timed out running specs for \'count.bound\'' );
            });

            it( 'should allow an upperBound query to return just a count' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.index( 'test' , 'age' ).count.upperBound( 30 , true ).done( function ( results ) {
                        expect( results ).toEqual( 1 );
                        done = true;
                    });
                });

                waitsFor( function () {
                    return done;
                } , 1000 , 'timed out running specs for \'count.upperBound\'' );
            });

            it( 'should allow a lowerBound query to return just a count' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.index( 'test' , 'age' ).count.lowerBound( 30 ).done( function ( results ) {
                        expect( results ).toEqual( 2 );
                        done = true;
                    });
                });

                waitsFor( function () {
                    return done;
                } , 1000 , 'timed out running specs for \'count.lowerBound\'' );
            });
        });
    });

})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach );
