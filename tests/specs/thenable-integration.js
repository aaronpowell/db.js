(function ( db , describe , it , expect , beforeEach , afterEach , $ ) {
    'use strict';
    
    describe( 'thenable library promise integration' , function () {
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
                    next1();
                });
            }

            function next1() {
                spec.server
                    .test
                    .add({
                        firstName: 'Aaron',
                        lastName: 'Powell'
                    })
                    .then(function () {
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

        it( 'should be able to work with other thenable library' , function (done) {
            var ajaxData;
            var queryData;
            var ajaxDeferred = $.getJSON( '/base/tests/foo' );
            var queryDeferred = this
                .server
                .test
                .query()
                .all()
                .execute();

            Promise.all([Promise.resolve(ajaxDeferred), queryDeferred])
              .then(function (resolvedArray) {
                  ajaxData = resolvedArray[0]
                  queryData = resolvedArray[1]
                  next();
              });

            function next(){
                expect( queryData ).toBeDefined();
                expect( queryData.length ).toBe( 1 );
                expect( queryData[ 0 ].firstName ).toBe( 'Aaron' );
                expect( queryData[ 0 ].lastName ).toBe( 'Powell' );
                done();
            }
        });
    });
})( window.db , window.describe , window.it , window.expect , window.beforeEach , window.afterEach , window.jQuery );
