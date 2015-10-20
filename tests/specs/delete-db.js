(function ( db , describe , it , expect , beforeEach , afterEach ) {
    'use strict';
    describe( 'db.delete' , function () {
        var dbName = 'tests',
            indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;


        it( 'should delete a created db' , function (done) {
            db.open( {
                server: dbName ,
                version: 1,
                schema: { 
                    test: {
                    }
                }
            }).then(function ( s ) {
                s.close();
                db['delete'](dbName).then(function () {
                    var request = indexedDB.open(dbName);
                    request.onupgradeneeded = function (e){
                        expect(e.oldVersion).toEqual(0);
                        e.target.transaction.abort();
                        done();
                    };
                });
            },function (err) {
              done(err);
            });
        });
    });
})( window.db , window.describe , window.it , window.expect , window.beforeEach , window.afterEach );
