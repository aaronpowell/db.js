(function ( db , describe , it , runs , expect , waitsFor , beforeEach , afterEach ) {
    'use strict';
    
    describe( 'query' , function () {
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
                spec.item1 = {
                    firstName: 'Aaron',
                    lastName: 'Powell',
                    age: 20
                };
                spec.item2 = {
                    firstName: 'John',
                    lastName: 'Smith',
                    age: 30
                };
                spec.item3 = {
                    firstName: 'Aaron',
                    lastName: 'Jones',
                    age: 40
                };
                spec.server.add( 'test' , spec.item1 , spec.item2 , spec.item3 ).done( function () {
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

        it( 'should allow getting by id' , function () {
            var done = false;
            runs( function () {
                var spec = this;
                this.server
                    .get( 'test' , spec.item1.id )
                    .done( function ( x ) {
                        expect( x ).toBeDefined();
                        expect( x.id ).toEqual( spec.item1.id );
                        expect( x.firstName ).toEqual( spec.item1.firstName );
                        expect( x.lastName ).toEqual( spec.item1.lastName );
                        done = true;
                    });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out waiting for asserts' );
        });

        it( 'should allow a get all operation' , function () {
            var done = false;

            runs( function () {
                var spec = this;
                this.server.query( 'test' )
                    .all()
                    .execute()
                    .done( function ( results ) {
                        expect( results ).toBeDefined();
                        expect( results.length ).toEqual( 3 );
                        expect( results[0].id ).toEqual( spec.item1.id );
                        expect( results[1].id ).toEqual( spec.item2.id );
                        expect( results[2].id ).toEqual( spec.item3.id );

                        done = true;
                    });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running expects' );
        });

        it( 'should allow a get all descending operation' , function () {
            var done = false;

            runs( function () {
                var spec = this;
                this.server.query( 'test' )
                    .all()
                    .desc()
                    .execute()
                    .done( function ( results ) {
                        expect( results ).toBeDefined();
                        expect( results.length ).toEqual( 3 );
                        expect( results[0].id ).toEqual( spec.item3.id );
                        expect( results[1].id ).toEqual( spec.item2.id );
                        expect( results[2].id ).toEqual( spec.item1.id );

                        done = true;
                    });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running expects' );
        });

        it( 'should query against a single property' , function () {
            var done;
            runs( function () {
                var spec = this;
                this.server
                    .query( 'test' )
                    .filter('firstName', 'Aaron')
                    .execute()
                    .done( function ( results ) {
                        expect( results ).toBeDefined();
                        expect( results.length ).toEqual( 2 );
                        expect( results[0].firstName ).toEqual( spec.item1.firstName );
                        expect( results[1].firstName ).toEqual( spec.item3.firstName );

                        done = true;
                    });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running expects' );
        });

        it( 'should query using a function filter' , function () {
            var done;
            runs( function () {
                var spec = this;
                this.server
                    .query( 'test' )
                    .filter( function ( x ) {
                        return x.firstName === 'Aaron' && x.lastName === 'Powell'
                    })
                    .execute()
                    .done(function ( results ) {
                        expect( results ).toBeDefined();
                        expect( results.length ).toEqual( 1 );
                        expect( results[0].firstName ).toEqual( spec.item1.firstName );
                        expect( results[0].firstName ).toEqual( spec.item1.firstName );

                        done = true;
                    });
            });

            waitsFor( function () {
                return done;
            } , 1000 , 'timed out running expects' );
        });

        describe( 'index range query' , function () {
            it( 'should allow matching exact values' , function () {
                var spec = this;
                var done;
                runs( function () {
                    spec.server.query( 'test' , 'firstName' )
                        .only( 'Aaron' )
                        .execute()
                        .done( function ( results ) {
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
                    spec.server.query( 'test' , 'age' )
                        .lowerBound( 30 )
                        .execute()
                        .done( function ( results ) {
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
                    spec.server.query( 'test' , 'age' )
                        .upperBound( 30, true )
                        .execute()
                        .done( function ( results ) {
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
                    spec.server.query( 'test' , 'age' )
                        .bound( 20, 40, false, false )
                        .execute()
                        .done( function ( results ) {
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
                    spec.server.query( 'test' , 'age' )
                        .bound( 20, 40, true , true )
                        .execute()
                        .done( function ( results ) {
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
                    spec.server.query( 'test' , 'age' )
                        .bound( 20, 40, false, true )
                        .execute()
                        .done( function ( results ) {
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

        describe( 'distinct querying' , function () {
            it( 'should allow distinct querying even if the index isn\'t unique' , function () {
                var done;

                runs(function () {
                    var spec = this;

                    spec.server.test
                        .query( 'firstName' )
                        .only( 'Aaron' )
                        .distinct()
                        .execute()
                        .done( function ( data ) {
                            expect( data.length ).toEqual( 1 );

                            done = true;
                        });
                });

                waitsFor(function () {
                    return done;
                } , 1000 , 'timeout in distinct query' );
            });

            it( 'should return the first record when distinct ascending' , function () {
                var done;

                runs(function () {
                    var spec = this;

                    spec.server.test
                        .query( 'firstName' )
                        .only( 'Aaron' )
                        .distinct()
                        .execute()
                        .done( function ( data ) {
                            expect( data[ 0 ].firstName ).toEqual( spec.item1.firstName );

                            done = true;
                        });
                });

                waitsFor(function () {
                    return done;
                } , 1000 , 'timeout in distinct query' );
            });

            it( 'should return only one record per key in a dinstinct query' , function () {
                var done;

                runs(function () {
                    var spec = this;

                    spec.server.test
                        .query( 'firstName' )
                        .all()
                        .distinct()
                        .execute()
                        .done( function ( data ) {
                            expect( data.length ).toEqual( 2 );
                            expect( data[ 0 ].firstName ).toEqual( spec.item1.firstName );
                            expect( data[ 0 ].lastName ).toEqual( spec.item1.lastName );
                            expect( data[ 1 ].firstName ).toEqual( spec.item2.firstName );
                            expect( data[ 1 ].lastName ).toEqual( spec.item2.lastName );
                            done = true;
                        });
                });

                waitsFor(function () {
                    return done;
                } , 1000 , 'timeout in distinct query' );
            });

            it( 'should return only one record per key in a dinstinct query in descending order' , function () {
                var done;

                runs(function () {
                    var spec = this;

                    spec.server.test
                        .query( 'firstName' )
                        .all()
                        .distinct()
                        .desc()
                        .execute()
                        .done( function ( data ) {
                            expect( data.length ).toEqual( 2 );
                            expect( data[ 0 ].id ).toEqual( spec.item2.id );
                            expect( data[ 1 ].id ).toEqual( spec.item1.id );
                            done = true;
                        });
                });

                waitsFor(function () {
                    return done;
                } , 1000 , 'timeout in distinct query' );
            });
        });

        describe( 'limit' , function () {
            it( 'should return first 2 records' , function () {
                var done;

                runs(function () {
                    var spec = this;

                    spec.server.test
                        .query( 'firstName' )
                        .all()
                        .limit(2)
                        .execute()
                        .done( function ( data ) {
                            expect( data.length ).toEqual( 2 );
                            expect( data[ 0 ].id ).toEqual( spec.item1.id );
                            expect( data[ 1 ].id ).toEqual( spec.item3.id );
                            done = true;
                        });
                });

                waitsFor(function () {
                    return done;
                } , 1000 , 'timeout in limit query' );
            });
            it( 'should return 2 records, skipping the first' , function () {
                var done;

                runs(function () {
                    var spec = this;

                    spec.server.test
                        .query( 'firstName' )
                        .all()
                        .limit(1, 3)
                        .execute()
                        .done( function ( data ) {
                            expect( data.length ).toEqual( 2 );
                            expect( data[ 0 ].id ).toEqual( spec.item3.id );
                            expect( data[ 1 ].id ).toEqual( spec.item2.id );
                            done = true;
                        });
                });

                waitsFor(function () {
                    return done;
                } , 1000 , 'timeout in limit query' );
            });

            it( 'should return 1 records, skipping the first' , function () {
                var done;

                runs(function () {
                    var spec = this;

                    spec.server.test
                        .query( 'firstName' )
                        .all()
                        .limit(1, 1)
                        .execute()
                        .done( function ( data ) {
                            expect( data.length ).toEqual( 1 );
                            expect( data[ 0 ].id ).toEqual( spec.item3.id );
                            done = true;
                        });
                });

                waitsFor(function () {
                    return done;
                } , 1000 , 'timeout in limit query' );
            });

            it( 'should return 1 records, skipping the first two' , function () {
                var done;

                runs(function () {
                    var spec = this;

                    spec.server.test
                        .query( 'firstName' )
                        .all()
                        .limit(2, 1)
                        .execute()
                        .done( function ( data ) {
                            expect( data.length ).toEqual( 1 );
                            expect( data[ 0 ].id ).toEqual( spec.item2.id );
                            done = true;
                        });
                });

                waitsFor(function () {
                    return done;
                } , 1000 , 'timeout in limit query' );
            });

        });

        describe( 'query mapping' , function () {
            it( 'should allow you to transform the object being returned' , function () {
                var done;

                runs(function () {
                    var spec = this;

                    spec.server.test
                        .query( 'age' )
                        .lowerBound(30)
                        .map(function (value) { 
                            return {
                                fullName: value.firstName + ' ' + value.lastName,
                                raw: value
                            };
                        })
                        .execute()
                        .done( function ( data ) {
                            expect(data[0].fullName).toEqual(data[0].raw.firstName + ' ' + data[0].raw.lastName);
                            done = true;
                        });
                });

                waitsFor(function () {
                    return done;
                } , 1000 , 'timeout in atomic modify query' );
            });
        });

        describe( 'atomic updates' , function () {
            it( 'should modify only data returned by query' , function () {
                var done;

                runs(function () {
                    var spec = this;

                    spec.server.test
                        .query( 'age' )
                        .lowerBound(30)
                        .modify({aboveThirty: true})
                        .execute()
                        .done( function ( data ) {
                            expect( data.length ).toEqual(2);
                            for(var i = 0; i < data.length; i++)
                            {
                                var result = data[i];
                                expect(result.aboveThirty).toEqual(true);
                            }
                            expect( data[ 0 ].id ).toEqual( spec.item2.id );
                            expect( data[ 1 ].id ).toEqual( spec.item3.id );
                            done = true;
                        });
                });

                waitsFor(function () {
                    return done;
                } , 1000 , 'timeout in atomic modify query' );
            });

            it( 'should modify data using a function of the original data' , function () {
                var done;

                runs(function () {
                    var spec = this;

                    spec.server.test
                        .query()
                        .all()
                        .modify({nextAge: function( item ) { return item.age + 1; }})
                        .execute()
                        .done( function ( data ) {
                            expect( data.length ).toEqual(3);
                            for(var i = 0; i < data.length; i++)
                            {
                                var result = data[i];
                                expect(result.nextAge).toEqual(result.age + 1);
                            }
                            done = true;
                        });
                });

                waitsFor(function () {
                    return done;
                } , 1000 , 'timeout in atomic modify query' );
            });

            it( 'should only allow `modify` from a specific query type' , function () {
                var done;

                runs(function () {
                    var spec = this;

                    expect(spec.server.test.get('id').modify).toBeUndefined();
                    expect(spec.server.test.query().modify).toBeUndefined();
                    expect(spec.server.test.query().all().modify instanceof Function).toEqual(true);
                    expect(spec.server.test.query().filter({my:'filter'}).modify instanceof Function).toEqual(true);
                    expect(spec.server.test.query('age').only(30).modify instanceof Function).toEqual(true);
                    expect(spec.server.test.query('age').bound(1, 3).modify instanceof Function).toEqual(true);
                    expect(spec.server.test.query('age').lowerBound(1).modify instanceof Function).toEqual(true);
                    expect(spec.server.test.query('age').upperBound(3).modify instanceof Function).toEqual(true);
                    expect(spec.server.test.query('age').upperBound(3).desc().modify instanceof Function).toEqual(true);
                    done = true;
                });

                waitsFor(function () {
                    return done;
                } , 1000 , 'timeout in atomic modify query' );
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
                    lastName: 'Jones',
                    age: 40,
                    tags: ['one', 'two', 'three', 'four']
                };
                spec.server.add( 'test' , item1 , item2 , item3 ).done( function () {
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
                        done = true;
                        expect( data.length ).toEqual( 3 );
                        expect( data[0].firstName ).toEqual( 'Aaron' );
                        expect( data[2].tags ).toEqual( ['one', 'two', 'three', 'four' ] );
                    });
            });

            waitsFor(function () {
                return done;
            }, 1000);
        });

        it('should query for all data in a multiEntry index', function () {
            var spec = this,
                done = false;

            runs(function () {
                spec.server.test
                    .query( 'tags' )
                    .all()
                    .execute()
                    .done(function ( data ) {
                        done = true;
                        expect( data.length ).toEqual( 10 );
                    });
            });

            waitsFor(function () {
                return done;
            }, 1000);
        });
    });
})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach );
