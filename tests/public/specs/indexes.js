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
                    id: 1,
                    firstName: 'Aaron',
                    lastName: 'Powell',
                    age: 20
                };
                var item2 = {
                    id: 2,
                    firstName: 'John',
                    lastName: 'Smith',
                    age: 30
                };
                var item3 = {
                    id: 3,
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
                spec.server.query( 'test' , 'firstName' ).only( 'Aaron' ).execute().done( function ( results ) {
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
                spec.server.query( 'test' , 'age' ).lowerBound( 30 ).execute().done( function ( results ) {
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
                spec.server.query( 'test' , 'age' ).upperBound( 30, true ).execute().done( function ( results ) {
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
                spec.server.query( 'test' , 'age' ).bound( 20, 40, false, false ).execute().done( function ( results ) {
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
                spec.server.query( 'test' , 'age' ).bound( 20, 40, true , true ).execute().done( function ( results ) {
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
                spec.server.query( 'test' , 'age' ).bound( 20, 40, false, true ).execute().done( function ( results ) {
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

        it( 'should allow descending ordering of results', function () {
            var spec = this;
            var done;
            runs( function () {
                spec.server.query( 'test' , 'age' )
                    .bound( 20, 40, false, true )
                    .desc()
                    .execute()
                    .done( function ( results ) {
                        expect( results.length ).toEqual( 2 );
                        expect( results[0].age ).toEqual( 30 );
                        expect( results[1].age ).toEqual( 20 );
                        done = true;
                    });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running specs for \'bound\'' );
        });

        describe( 'index.query.count' , function () {
            it( 'should allow an only query to return just a count' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.query( 'test' , 'firstName' )
                        .only( 'Aaron' )
                        .count()
                        .execute()
                        .done( function ( results ) {
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
                    spec.server.query( 'test' , 'age' )
                        .bound( 20 , 40 , false , false )
                        .count()
                        .execute()
                        .done( function ( results ) {
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
                    spec.server.query( 'test' , 'age' )
                        .upperBound( 30 , true )
                        .count()
                        .execute()
                        .done( function ( results ) {
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
                    spec.server.query( 'test' , 'age' )
                        .lowerBound( 30 )
                        .count()
                        .execute()
                        .done( function ( results ) {
                            expect( results ).toEqual( 2 );
                            done = true;
                        });
                });

                waitsFor( function () {
                    return done;
                } , 1000 , 'timed out running specs for \'count.lowerBound\'' );
            });
        });

        describe( 'index.query.keys' , function () {
            it( 'should allow an only query to return just the keys' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.query( 'test' , 'firstName' )
                        .only( 'Aaron' )
                        .keys()
                        .execute()
                        .done( function ( results ) {
                            expect( results.length ).toEqual( 2 );
                            expect( results[0] ).toEqual( 'Aaron' );
                            expect( results[1] ).toEqual( 'Aaron' );
                            done = true;
                        });
                });

                waitsFor( function () {
                    return done;
                } , 1000 , 'timed out running specs for \'only.keys\'' );
            });

            it( 'should allow a bound query to return just the keys' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.query( 'test' , 'age' )
                        .bound( 20 , 40 , false , false )
                        .keys()
                        .execute()
                        .done( function ( results ) {
                            expect( results.length ).toEqual( 3 );
                            expect( results[0] ).toEqual( 20 );
                            expect( results[1] ).toEqual( 30 );
                            expect( results[2] ).toEqual( 40 );
                            done = true;
                        });
                });

                waitsFor( function () {
                    return done;
                } , 1000 , 'timed out running specs for \'bound.keys\'' );
            });

            it( 'should allow an upperBound query to return just the keys' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.query( 'test' , 'age' )
                        .upperBound( 30 , true )
                        .keys()
                        .execute()
                        .done( function ( results ) {
                            expect( results.length ).toEqual( 1 );
                            expect( results[0] ).toEqual( 20 );
                            done = true;
                        });
                });

                waitsFor( function () {
                    return done;
                } , 1000 , 'timed out running specs for \'upperBound.keys\'' );
            });

            it( 'should allow a lowerBound query to return just the keys' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.query( 'test' , 'age' )
                        .lowerBound( 30 )
                        .keys()
                        .execute()
                        .done( function ( results ) {
                            expect( results.length ).toEqual( 2 );
                            expect( results[0] ).toEqual( 30 );
                            expect( results[1] ).toEqual( 40 );
                            done = true;
                        });
                });

                waitsFor( function () {
                    return done;
                } , 1000 , 'timed out running specs for \'lowerBound.keys\'' );
            });
        });

        describe( 'index.query.filters' , function () {
            it( 'should allow additional filter on an only query' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.query( 'test' , 'firstName' )
                        .only( 'Aaron' )
                        .filter(function ( person ) {
                            return person.age < 40;
                        })
                        .execute()
                        .done( function ( results ) {
                            expect( results.length ).toEqual( 1 );
                            done = true;
                        });
                });

                waitsFor( function () {
                    return done;
                } , 1000 , 'timed out running specs for \'only.filter\'' );
            });

            it( 'should allow a filter without an index' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.query( 'test' )
                        .filter( function ( person ) {
                            return person.age < 40;
                        })
                        .execute()
                        .done( function ( results ) {
                            expect( results.length ).toEqual( 2 );
                            done = true;
                        });
                });

                waitsFor( function () {
                    return done;
                } , 1000 , 'timed out running specs for \'filter\'' );
            });

            it( 'should allow a filter without an index to do multi-field filtering' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.query( 'test' )
                        .filter( function ( person ) {
                            return person.age < 40 && person.firstName === 'Aaron';
                        })
                        .execute()
                        .done( function ( results ) {
                            expect( results.length ).toEqual( 1 );
                            done = true;
                        });
                });

                waitsFor( function () {
                    return done;
                } , 1000 , 'timed out running specs for \'filter\'' );
            });
        });
    });

    describe( 'index.multiEntry' , function () {
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
                                age: { },
                                tags: {
                                    multiEntry: true
                                }
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
                    id: 1,
                    firstName: 'Aaron',
                    lastName: 'Powell',
                    age: 20,
                    tags: ['one', 'two', 'three']
                };
                var item2 = {
                    id: 2,
                    firstName: 'John',
                    lastName: 'Smith',
                    age: 30,
                    tags: ['one', 'two', 'three']
                };
                var item3 = {
                    id: 3,
                    firstName: 'Aaron',
                    lastName: 'Smith',
                    age: 40,
                    tags: ['one', 'two', 'three', 'four']
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

        it('should query for data in a multiEntry index', function () {
            var spec = this,
                done = false;

            runs(function () {
                spec.server.test
                    .query( 'tags' )
                    .only( 'one' )
                    .execute()
                    .done(function ( data ) {
                        expect( data.length ).toEqual( 3 );
                        expect( data[0].firstName ).toEqual( 'Aaron' );
                        expect( data[2].tags ).toEqual( ['one', 'two', 'three', 'four' ] );
                        done = true;
                    });
            });

            waitsFor(function () {
                return done;
            }, 1000);
        });
    });

})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach );
