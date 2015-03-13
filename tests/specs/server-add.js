(function ( db , describe , it , xit, expect , beforeEach , afterEach ) {
    'use strict';
    
    describe( 'server.add' , function () {
        var dbName = 'tests',
          indexedDB = db.indexedDB;

        beforeEach( function (done) {
            var spec = this;
            
            spec.server = undefined;
            
            db.remove(dbName).then(next, function(err) {
                console.log( 'failed to delete db' , arguments );
                done(err);
            });

            function next() {
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
                    done();
                });
            }
        }, 10000);
        
        afterEach( function (done) {
            if ( this.server ) {
                this.server.close();
            }
            db.remove(dbName).then(done, function(err) {
                console.log( 'failed to delete db' , arguments );
                done(err);
            });
        });
           
        it( 'should insert a new item into the object store' , function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            
            spec.server.add( 'test' , item ).then( function ( records ) {
                item = records[0];
                next();
            }, function(err) {
                done(err);
            });

            function next(){
                expect( item.id ).toBeDefined();
                expect( item.id ).toEqual( 1 );
                done();
            };
        });
        
        it( 'should insert multiple records' , function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'John',
                lastName: 'Smith'
            };
            
            var spec = this;
            
            spec.server.add( 'test' , item1 , item2 ).then(next);
            function next() {
                expect( item1.id ).toBeDefined();
                expect( item1.id ).toEqual( 1 );
                expect( item2.id ).toBeDefined();
                expect( item2.id ).toEqual( 2 );
                done();
            }
        });
    });

    describe( 'server.add-non-autoincrement key' , function () {
        var dbName = 'tests',
            indexedDB = db.indexedDB;
           
       beforeEach( function (done) {
            var spec = this;
            
            spec.server = undefined;
            
            db.remove(dbName).then(next, function(err) {
                console.log( 'failed to delete db' , arguments );
                done(err);
            });

            function next(){
                db.open( {
                    server: dbName ,
                    version: 1 ,
                    schema: { 
                        test: {
                            key: {
                                keyPath: 'id',
                                autoIncrement: false
                            }
                        }
                    }
                }).then(function ( s ) {
                    spec.server = s;
                    done();
                });
            }
        });
        
        afterEach( function (done) {
            if ( this.server ) {
                this.server.close();
            }
            db.remove(dbName).then(done, function(err) {
                console.log( 'failed to delete db' , arguments );
                done(err);
            });
        });

        it( 'should insert a new item into the object store' , function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell',
                id: 'abcd'
            };
            
            var spec = this;
            
            spec.server.add( 'test' , item ).then( function ( records ) {
                item = records[0];
                next();
            });
            
            function next() {
                expect( item.id ).toBeDefined();
                expect( item.id ).toEqual( 'abcd' );
                done();
            };
        });
    });

    describe( 'server.add no keyPath' , function (done) {
        var dbName = 'tests',
            indexedDB = db.indexedDB;
           
        beforeEach( function (done) {
            var spec = this;
            
            spec.server = undefined;
            
            db.remove(dbName).then(next, function(err) {
                console.log( 'failed to delete db' , arguments );
                done(err);
            });
            
            function next() {
                db.open( {
                    server: dbName ,
                    version: 1 ,
                    schema: { 
                        test: {
                            key: {
                                autoIncrement: true
                            }
                        }
                    }
                }).then(function ( s ) {
                    spec.server = s;
                    done();
                });
            }
        }, 10000);
        
        afterEach( function (done) {
            if ( this.server ) {
                this.server.close();
            }
            db.remove(dbName).then(done, function(err) {
                console.log( 'failed to delete db' , arguments );
                done(err);
            });
        });

        it( 'should insert a new item into the object store' , function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            var spec = this;

            spec.server.add( 'test' , item ).then( function ( records ) {
                item = records[0];
                next();
            });

            function next(){
                expect( item.__id__ ).toBeDefined();
                expect( item.__id__ ).toEqual( 1 );
                done();
            }
        });

        it( 'should insert multiple items into the object store' , function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            
            spec.server.add( 'test' , item1 , item2 ).then( function ( records ) {
                expect( item1.__id__ ).toBeDefined();
                expect( item1.__id__ ).toEqual( 1 );
                expect( item2.__id__ ).toBeDefined();
                expect( item2.__id__ ).toEqual( 2 );
                done();
            });
        });

        it( 'should insert multiple items into the object store, using an array' , function (done) {
            var items = [
                {
                    firstName: 'Aaron',
                    lastName: 'Powell'
                },
                {
                    firstName: 'Aaron',
                    lastName: 'Powell'
                }
            ];
            
            var spec = this;
            
            spec.server.add( 'test' , items ).then( function ( records ) {
                expect( items[0].__id__ ).toBeDefined();
                expect( items[0].__id__ ).toEqual( 1 );
                expect( items[1].__id__ ).toBeDefined();
                expect( items[1].__id__ ).toEqual( 2 );
                done();
            });
        });

        it( 'should insert an item with a provided key into the object store' , function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            
            spec.server.add( 'test' , {
                item: item1,
                key: 1.001
            } ).then( function ( records ) {
                expect( item1.__id__ ).toBeDefined();
                expect( item1.__id__ ).toEqual( 1.001 );
                done();
            });
        });

        it( 'should insert an item with a provided string key into the object store' , function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;

            spec.server.add( 'test' , {
                item: item1,
                key: 'key'
            } ).then( function ( records ) {
                expect( item1.__id__ ).toBeDefined();
                expect( item1.__id__ ).toEqual( 'key' );
                done();
            });
        });

        it( 'should insert multiple items with the provided keys into the object store' , function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            
            spec.server.add( 'test' , {
                item: item1,
                key: 'key'
            } , {
                item: item2,
                key: 5
            } ).then( function ( records ) {
                expect( item1.__id__ ).toBeDefined();
                expect( item1.__id__ ).toEqual( 'key' );
                expect( item2.__id__ ).toBeDefined();
                expect( item2.__id__ ).toEqual( 5 );
                done();
            });
        });

        it( 'should insert multiple items with mixed key generation' , function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item3 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            
            spec.server.add( 'test' , item1 , {
                item: item2,
                key: 5
            } , item3 ).then( function ( records ) {
                expect( item1.__id__ ).toBeDefined();
                expect( item1.__id__ ).toEqual( 1 );
                expect( item2.__id__ ).toBeDefined();
                expect( item2.__id__ ).toEqual( 5 );
                expect( item3.__id__ ).toBeDefined();
                expect( item3.__id__ ).toEqual( 6 );
                done();
            });
        });

        it( 'should count with key properly', function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item3 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };

            var spec = this;
            spec.server.add( 'test' , item1 , {
                item: item2,
                key: 5
            } , item3 ).then( function ( records ) {
                spec.server.count( 'test').then(function(count){
                    expect( count ).toEqual( 3 );
                    done();
                }, function(error) {
                    expect( error ).toBeUndefined();
                    done(error);
                })
            });
        });

        it( 'should error when adding an item with an existing key' , function (done) {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var key = 'key';
            
            var spec = this;
            
            spec.server.add( 'test' , {
                item: item1,
                key: key
            } ).then( function ( records ) {
              next();
            });
            
            function next() {
                spec.server.add( 'test' , {
                    item: item1,
                    key: key
                } ).then( function ( records ) {
                    done(records);
                }).catch( function ( e ) {
                    expect( e.target.error.name ).toBe( 'ConstraintError' );
                    done();
                });
            };
        });
    });

})( window.db , window.describe , window.it , window.xit, window.expect , window.beforeEach , window.afterEach );
