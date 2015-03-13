(function ( db , describe , it , expect , beforeEach , afterEach ) {
    'use strict';
    
    describe( 'server.update' , function () {
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

        it( 'should update the item after it is added' , function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            
            spec.server.add( 'test' , item ).then( function ( records ) {
                next();
            });

            function next(){
                item.firstName = 'John';
                item.lastName = 'Smith';

                spec.server
                    .test
                    .update( item )
                    .then( function ( records ) {
                        expect( item.id ).toBe( 1 );
                        next1();
                    });
            };

            function next1(){
                spec.server
                    .test
                    .get( item.id )
                    .then( function ( record ) {
                        expect( record ).toBeDefined();
                        expect( record.id ).toBe( item.id );
                        expect( record.firstName ).toBe( item.firstName );
                        expect( record.lastName ).toBe( item.lastName );
                        expect( record ).not.toBe( item );
                        done();
                    });
            };

        });

        it( 'should allow updating of multiple items' , function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Bob',
                lastName: 'Down'
            };
            
            var spec = this;

            spec.server.add( 'test' , item , item2 ).then( function ( records ) {
                next();
            });

            function next() {
                item.firstName = 'John';
                item.lastName = 'Smith';

                item2.firstName = 'Billy';
                item2.lastName = 'Brown';

                spec.server
                    .test
                    .update( item , item2 )
                    .then( function ( records ) {
                        next1();
                    });
            }

            function next1() {
                spec.server
                    .test
                    .query()
                    .all()
                    .execute()
                    .then( function ( records ) {
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
                        done();
                    });
            };
        });

    });

    describe( 'server.update-custom-keys' , function () {
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
                        }
                    }
                }).then(function ( s ) {
                    spec.server = s;
                    done();
                });
            };
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

        it( 'should allow updating with custom keys' , function (done) {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var key = 'foo';
            
            var spec = this;

            spec.server
            .add( 'test' , {
                item: item,
                key: key
            }).then( function ( records ) {
                next();
            });

            function next() {
                item.firstName = 'John';
                item.lastName = 'Smith';

                spec.server
                    .test
                    .update( {
                        item: item,
                        key: key
                    } )
                    .then( function ( records ) {
                        next1();
                    });
            }

            function next1() {
                spec.server
                    .test
                    .query()
                    .all()
                    .execute()
                    .then( function ( records ) {
                        expect( records.length ).toBe( 1 );

                        var record = records[0];
                        expect( record ).toBeDefined();
                        expect( record.__id__ ).toBe( key );
                        expect( record.firstName ).toBe( item.firstName );
                        expect( record.lastName ).toBe( item.lastName );
                        expect( record ).not.toBe( item );
                        done();
                    });
            }
        });
    });

})( window.db , window.describe , window.it , window.expect , window.beforeEach , window.afterEach );
