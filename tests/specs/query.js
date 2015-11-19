/*global window, console*/
/*jslint vars:true*/
(function ( db , describe , it , expect , beforeEach , afterEach ) {
    'use strict';

    describe( 'query' , function () {
        var dbName = 'tests',
            indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

       beforeEach( function (done) {
            var spec = this;

            spec.server = undefined;

            var req = indexedDB.deleteDatabase( dbName );

            req.onsuccess = function () {
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
                }).then(function () {
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
                    spec.server.add( 'test' , spec.item1 , spec.item2 , spec.item3 ).then( function () {
                        done();
                    });
                });
            };

            req.onerror = function () {
                console.log( 'failed to delete db in beforeEach' , arguments );
            };

            req.onblocked = function () {
                console.log( 'db blocked' , arguments , spec );
            };
        });

        afterEach( function (done) {
            if ( this.server ) {
                this.server.close();
            }

            var spec = this;

            var req = indexedDB.deleteDatabase( dbName );

            req.onsuccess = function () {
                done();
            };

            req.onerror = function () {
                console.log( 'failed to delete db in afterEach' , arguments , spec );
            };

            req.onblocked = function () {
                console.log( 'db blocked' , arguments );
            };
        });

        it( 'should allow getting by id' , function (done) {
            var spec = this;
            this.server
                .get( 'test' , spec.item1.id )
                .then( function ( x ) {
                    expect( x ).toBeDefined();
                    expect( x.id ).toEqual( spec.item1.id );
                    expect( x.firstName ).toEqual( spec.item1.firstName );
                    expect( x.lastName ).toEqual( spec.item1.lastName );
                    done();
                });
        });

        it( 'should allow a get all operation' , function (done) {
            var spec = this;
            this.server.query( 'test' )
                .all()
                .execute()
                .then( function ( results ) {
                    expect( results ).toBeDefined();
                    expect( results.length ).toEqual( 3 );
                    expect( results[0].id ).toEqual( spec.item1.id );
                    expect( results[1].id ).toEqual( spec.item2.id );
                    expect( results[2].id ).toEqual( spec.item3.id );

                    done();
                });
        });

        it( 'should allow a get all descending operation' , function (done) {
            var spec = this;
            this.server.query( 'test' )
                .all()
                .desc()
                .execute()
                .then( function ( results ) {
                    expect( results ).toBeDefined();
                    expect( results.length ).toEqual( 3 );
                    expect( results[0].id ).toEqual( spec.item3.id );
                    expect( results[1].id ).toEqual( spec.item2.id );
                    expect( results[2].id ).toEqual( spec.item1.id );

                    done();
                });
        });

        it( 'should query against a single property' , function (done) {
            var spec = this;
            this.server
                .query( 'test' )
                .filter('firstName', 'Aaron')
                .execute()
                .then( function ( results ) {
                    expect( results ).toBeDefined();
                    expect( results.length ).toEqual( 2 );
                    expect( results[0].firstName ).toEqual( spec.item1.firstName );
                    expect( results[1].firstName ).toEqual( spec.item3.firstName );

                    done();
                });
        });

        it( 'should query using a function filter' , function (done) {
            var spec = this;
            this.server
                .query( 'test' )
                .filter( function ( x ) {
                    return x.firstName === 'Aaron' && x.lastName === 'Powell';
                })
                .execute()
                .then(function ( results ) {
                    expect( results ).toBeDefined();
                    expect( results.length ).toEqual( 1 );
                    expect( results[0].firstName ).toEqual( spec.item1.firstName );
                    expect( results[0].firstName ).toEqual( spec.item1.firstName );

                    done();
                });
        });

        describe('index range query (range method)', function () {
            it('should allow matching exact values', function (done) {
                this.server.query('test', 'firstName')
                    .range({eq: 'Aaron'})
                    .execute()
                    .then(function (results) {
                        expect(results.length).toEqual(2);
                        done();
                    });
            });

            it('should allow matching on a lower bound range', function (done) {
                this.server.query('test', 'age')
                    .range({gte: 30})
                    .execute()
                    .then(function (results) {
                        expect(results.length).toEqual(2);
                        expect(results[0].age).toEqual(30);
                        expect(results[1].age).toEqual(40);
                        done();
                    });
            });

            it('should allow matching on an upper bound range', function (done) {
                this.server.query('test', 'age')
                    .range({lt: 30})
                    .execute()
                    .then(function (results) {
                        expect(results.length).toEqual(1);
                        expect(results[0].age).toEqual(20);
                        done();
                    });
            });

            it('should allow matching across a whole bound range with inclusive limits', function (done) {
                this.server.query('test', 'age')
                    .range({gte: 20, lte: 40})
                    .execute()
                    .then(function (results) {
                        expect(results.length).toEqual(3);
                        expect(results[0].age).toEqual(20);
                        expect(results[1].age).toEqual(30);
                        expect(results[2].age).toEqual(40);
                        done();
                    });
            });

            it('should allow matching across a whole bound range with exclusive limits', function (done) {
                this.server.query('test', 'age')
                    .range({gt: 20, lt: 40})
                    .execute()
                    .then(function (results) {
                        expect(results.length).toEqual(1);
                        expect(results[0].age).toEqual(30);
                        done();
                    });
            });

            it('should allow matching across a whole bound range with mixed limits', function (done) {
                this.server.query('test', 'age')
                    .range({gte: 20, lt: 40})
                    .execute()
                    .then(function (results) {
                        expect(results.length).toEqual(2);
                        expect(results[0].age).toEqual(20);
                        expect(results[1].age).toEqual(30);
                        done();
                    });
            });

            it('should allow descending ordering of results', function (done) {
                this.server.query('test', 'age')
                    .range({gte: 20, lt: 40})
                    .desc()
                    .execute()
                    .then(function (results) {
                        expect(results.length).toEqual(2);
                        expect(results[0].age).toEqual(30);
                        expect(results[1].age).toEqual(20);
                        done();
                    });
            });
        });

        describe( 'index range query' , function () {
            it( 'should allow matching exact values' , function (done) {
                this.server.query( 'test' , 'firstName' )
                    .only( 'Aaron' )
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 2 );
                        done();
                    });
            });

            it( 'should allow matching on a lower bound range' , function (done) {
                this.server.query( 'test' , 'age' )
                    .lowerBound( 30 )
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 2 );
                        expect( results[0].age ).toEqual( 30 );
                        expect( results[1].age ).toEqual( 40 );
                        done();
                    });
            });

            it( 'should allow matching on an upper bound range' , function (done) {
                this.server.query( 'test' , 'age' )
                    .upperBound( 30, true )
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 1 );
                        expect( results[0].age ).toEqual( 20 );
                        done();
                    });
            });

            it( 'should allow matching across a whole bound range with inclusive limits', function (done) {
                this.server.query( 'test' , 'age' )
                    .bound( 20, 40, false, false )
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 3 );
                        expect( results[0].age ).toEqual( 20 );
                        expect( results[1].age ).toEqual( 30 );
                        expect( results[2].age ).toEqual( 40 );
                        done();
                    });
            });

            it( 'should allow matching across a whole bound range with exclusive limits', function (done) {
                this.server.query( 'test' , 'age' )
                    .bound( 20, 40, true , true )
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 1 );
                        expect( results[0].age ).toEqual( 30 );
                        done();
                    });
            });

            it( 'should allow matching across a whole bound range with mixed limits', function (done) {
                this.server.query( 'test' , 'age' )
                    .bound( 20, 40, false, true )
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 2 );
                        expect( results[0].age ).toEqual( 20 );
                        expect( results[1].age ).toEqual( 30 );
                        done();
                    });
            });

            it( 'should allow descending ordering of results', function (done) {
                this.server.query( 'test' , 'age' )
                    .bound( 20, 40, false, true )
                    .desc()
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 2 );
                        expect( results[0].age ).toEqual( 30 );
                        expect( results[1].age ).toEqual( 20 );
                        done();
                    });
            });
        });

        describe( 'index.query.count' , function () {
            it( 'should allow an only query to return just a count' , function (done) {
                this.server.query( 'test' , 'firstName' )
                    .only( 'Aaron' )
                    .count()
                    .execute()
                    .then( function ( results ) {
                        expect( results ).toEqual( 2 );
                        done();
                    });
            });

            it( 'should allow a bound query to return just a count' , function (done) {
                this.server.query( 'test' , 'age' )
                    .bound( 20 , 40 , false , false )
                    .count()
                    .execute()
                    .then( function ( results ) {
                        expect( results ).toEqual( 3 );
                        done();
                    });
            });

            it( 'should allow an upperBound query to return just a count' , function (done) {
                this.server.query( 'test' , 'age' )
                    .upperBound( 30 , true )
                    .count()
                    .execute()
                    .then( function ( results ) {
                        expect( results ).toEqual( 1 );
                        done();
                    });
            });

            it( 'should allow a lowerBound query to return just a count' , function (done) {
                this.server.query( 'test' , 'age' )
                    .lowerBound( 30 )
                    .count()
                    .execute()
                    .then( function ( results ) {
                        expect( results ).toEqual( 2 );
                        done();
                    });
            });
        });

        describe( 'index.query.keys' , function () {
            it( 'should allow an only query to return just the keys' , function (done) {
                this.server.query( 'test' , 'firstName' )
                    .only( 'Aaron' )
                    .keys()
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 2 );
                        expect( results[0] ).toEqual( 'Aaron' );
                        expect( results[1] ).toEqual( 'Aaron' );
                        done();
                    });
            });

            it( 'should allow a bound query to return just the keys' , function (done) {
                this.server.query( 'test' , 'age' )
                    .bound( 20 , 40 , false , false )
                    .keys()
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 3 );
                        expect( results[0] ).toEqual( 20 );
                        expect( results[1] ).toEqual( 30 );
                        expect( results[2] ).toEqual( 40 );
                        done();
                    });
            });

            it( 'should allow an upperBound query to return just the keys' , function (done) {
                this.server.query( 'test' , 'age' )
                    .upperBound( 30 , true )
                    .keys()
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 1 );
                        expect( results[0] ).toEqual( 20 );
                        done();
                    });
            });

            it( 'should allow a lowerBound query to return just the keys' , function (done) {
                this.server.query( 'test' , 'age' )
                    .lowerBound( 30 )
                    .keys()
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 2 );
                        expect( results[0] ).toEqual( 30 );
                        expect( results[1] ).toEqual( 40 );
                        done();
                    });
            });
        });

        describe( 'index.query.filters' , function () {
            it( 'should allow additional filter on an only query' , function (done) {
                this.server.query( 'test' , 'firstName' )
                    .only( 'Aaron' )
                    .filter(function ( person ) {
                        return person.age < 40;
                    })
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 1 );
                        done();
                    });
            });

            it( 'should allow a filter without an index' , function (done) {
                var spec = this;
                spec.server.query( 'test' )
                    .filter( function ( person ) {
                        return person.age < 40;
                    })
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 2 );
                        done();
                    });
            });

            it( 'should allow a filter without an index to do multi-field filtering' , function (done) {
                this.server.query( 'test' )
                    .filter( function ( person ) {
                        return person.age < 40 && person.firstName === 'Aaron';
                    })
                    .execute()
                    .then( function ( results ) {
                        expect( results.length ).toEqual( 1 );
                        done();
                    });
            });
        });

        describe( 'distinct querying' , function () {
            it( 'should allow distinct querying even if the index isn\'t unique' , function (done) {
                this.server.test
                    .query( 'firstName' )
                    .only( 'Aaron' )
                    .distinct()
                    .execute()
                    .then( function ( data ) {
                        expect( data.length ).toEqual( 1 );

                        done();
                    });
            });

            it( 'should return the first record when distinct ascending' , function (done) {
                var spec = this;

                spec.server.test
                    .query( 'firstName' )
                    .only( 'Aaron' )
                    .distinct()
                    .execute()
                    .then( function ( data ) {
                        expect( data[ 0 ].firstName ).toEqual( spec.item1.firstName );

                        done();
                    });
            });

            it( 'should return only one record per key in a dinstinct query' , function (done) {
                var spec = this;

                spec.server.test
                    .query( 'firstName' )
                    .all()
                    .distinct()
                    .execute()
                    .then( function ( data ) {
                        expect( data.length ).toEqual( 2 );
                        expect( data[ 0 ].firstName ).toEqual( spec.item1.firstName );
                        expect( data[ 0 ].lastName ).toEqual( spec.item1.lastName );
                        expect( data[ 1 ].firstName ).toEqual( spec.item2.firstName );
                        expect( data[ 1 ].lastName ).toEqual( spec.item2.lastName );
                        done();
                    });
            });

            it( 'should return only one record per key in a dinstinct query in descending order' , function (done) {
                var spec = this;

                spec.server.test
                    .query( 'firstName' )
                    .all()
                    .distinct()
                    .desc()
                    .execute()
                    .then( function ( data ) {
                        expect( data.length ).toEqual( 2 );
                        expect( data[ 0 ].id ).toEqual( spec.item2.id );
                        expect( data[ 1 ].id ).toEqual( spec.item1.id );
                        done();
                    });
            });
        });

        describe( 'limit' , function () {
            it( 'should return first 2 records' , function (done) {
                var spec = this;

                spec.server.test
                    .query( 'firstName' )
                    .all()
                    .limit(2)
                    .execute()
                    .then( function ( data ) {
                        expect( data.length ).toEqual( 2 );
                        expect( data[ 0 ].id ).toEqual( spec.item1.id );
                        expect( data[ 1 ].id ).toEqual( spec.item3.id );
                        done();
                    });
            });
            it( 'should return 2 records, skipping the first' , function (done) {
                var spec = this;

                spec.server.test
                    .query( 'firstName' )
                    .all()
                    .limit(1, 3)
                    .execute()
                    .then( function ( data ) {
                        expect( data.length ).toEqual( 2 );
                        expect( data[ 0 ].id ).toEqual( spec.item3.id );
                        expect( data[ 1 ].id ).toEqual( spec.item2.id );
                        done();
                    });
            });

            it( 'should return 1 records, skipping the first' , function (done) {
                var spec = this;

                spec.server.test
                    .query( 'firstName' )
                    .all()
                    .limit(1, 1)
                    .execute()
                    .then( function ( data ) {
                        expect( data.length ).toEqual( 1 );
                        expect( data[ 0 ].id ).toEqual( spec.item3.id );
                        done();
                    });
            });

            it( 'should return 1 records, skipping the first two' , function (done) {
                var spec = this;

                spec.server.test
                    .query( 'firstName' )
                    .all()
                    .limit(2, 1)
                    .execute()
                    .then( function ( data ) {
                        expect( data.length ).toEqual( 1 );
                        expect( data[ 0 ].id ).toEqual( spec.item2.id );
                        done();
                    });
            });

        });

        describe( 'query mapping' , function () {
            it( 'should allow you to transform the object being returned' , function (done) {
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
                    .then( function ( data ) {
                        expect(data[0].fullName).toEqual(data[0].raw.firstName + ' ' + data[0].raw.lastName);
                        done();
                    });
            });
        });

        describe( 'atomic updates' , function () {
            it( 'should modify only data returned by query' , function (done) {
                var spec = this;

                spec.server.test
                    .query( 'age' )
                    .lowerBound(30)
                    .modify({aboveThirty: true})
                    .execute()
                    .then( function ( data ) {
                        expect( data.length ).toEqual(2);
                        var i;
                        for(i = 0; i < data.length; i++)
                        {
                            var result = data[i];
                            expect(result.aboveThirty).toEqual(true);
                        }
                        expect( data[ 0 ].id ).toEqual( spec.item2.id );
                        expect( data[ 1 ].id ).toEqual( spec.item3.id );
                        done();
                    });
            });

            it( 'should modify data using a function of the original data' , function (done) {
                var spec = this;

                spec.server.test
                    .query()
                    .all()
                    .modify({nextAge: function( item ) { return item.age + 1; }})
                    .execute()
                    .then( function ( data ) {
                        expect( data.length ).toEqual(3);
                        var i;
                        for(i = 0; i < data.length; i++)
                        {
                            var result = data[i];
                            expect(result.nextAge).toEqual(result.age + 1);
                        }
                        done();
                    });
            });

            it( 'should only allow `modify` from a specific query type' , function (done) {
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
                done();
            });
        });
    });

    describe( 'index.multiEntry' , function () {
        var dbName = 'tests',
            indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

       beforeEach( function (done) {
            var spec = this;

            spec.server = undefined;

            var req = indexedDB.deleteDatabase( dbName );

            req.onsuccess = function () {
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
                }).then(function ( s ) {
                    spec.server = s;
                }).then(function () {
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
                    spec.server.add( 'test' , item1 , item2 , item3 ).then( function () {
                        done();
                    });
                });
            };

            req.onerror = function () {
                console.log( 'failed to delete db in beforeEach' , arguments );
            };

            req.onblocked = function () {
                console.log( 'db blocked' , arguments , spec );
            };
        });

        afterEach( function (done) {
            if ( this.server ) {
                this.server.close();
            }

            var spec = this;

            var req = indexedDB.deleteDatabase( dbName );

            req.onsuccess = function () {
                done();
            };

            req.onerror = function () {
                console.log( 'failed to delete db in afterEach' , arguments , spec );
            };

            req.onblocked = function () {
                console.log( 'db blocked' , arguments );
            };
        });

        it('should query for data in a multiEntry index', function (done) {
            var spec = this;

            spec.server.test
                .query( 'tags' )
                .only( 'one' )
                .execute()
                .then(function ( data ) {
                    expect( data.length ).toEqual( 3 );
                    expect( data[0].firstName ).toEqual( 'Aaron' );
                    expect( data[2].tags ).toEqual( ['one', 'two', 'three', 'four' ] );
                    done();
                });
        });

        it('should query for all data in a multiEntry index', function (done) {
            var spec = this;
            spec.server.test
                .query( 'tags' )
                .all()
                .execute()
                .then(function ( data ) {
                    expect( data.length ).toEqual( 10 );
                    done();
                });
        });
    });
}( window.db , window.describe , window.it , window.expect , window.beforeEach , window.afterEach ));
