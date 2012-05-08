(function ( window ) {
    'use strict';
    var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB,
        IDBDatabase = window.IDBDatabase || window.webkitIDBDatabase,
        IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;
        
    var oldApi = !!IDBDatabase.prototype.setVersion;

	if ( !indexedDB ) {
		throw 'IndexedDB required';
	}
    
    var Server = function ( db , name ) {
        var that = this,
            closed = false;
        this.add = function( table , records , done ) {
            if ( closed ) {
                throw 'Database has been closed';
            }
            var transaction = db.transaction( table , IDBTransaction.READ_WRITE );
            var store = transaction.objectStore( table );
            
            if ( records.constructor !== Array ) {
                records = [ records ];
            }
            
            records.forEach( function ( record ) {
                store.add( record ).onsuccess = function ( e ) {
                    var target = e.target;
                    record[ target.source.keyPath ] = target.result;
                };
            });
            
            transaction.oncomplete = function () {
                done.call( that , records );
            };
        };
        
        this.remove = function ( table , key ) {
            if ( closed ) {
                throw 'Database has been closed';
            }
            var transaction = db.transaction( table , IDBTransaction.READ_WRITE );
            var store = transaction( table );
            
            store.delete( key );
        };
        
        this.query = function ( table ) {
            if ( closed ) {
                throw 'Database has been closed';
            }
            return new Query( table , db );
        };
        
        this.close = function ( ) {
            if ( closed ) {
                throw 'Database has been closed';
            }
            db.close();
            closed = true;
            delete dbCache[ name ];
        };
    };
    
    var Query = function ( table , db ) {
        var that = this,
            filters = [];
        
        this.filter = function ( field , value ) {
            filters.push( {
                field: field,
                value: value
            });
            return that;
        };
        
        this.execute = function ( done ) {
            var records = [],
                transaction = db.transaction( table , IDBTransaction.READ_ONLY ),
                store = transaction.objectStore( table );
            
            store.openCursor().onsuccess = function ( e ) {
                var value, f,
                    inc = true,
                    cursor = e.target.result;
                
                if ( cursor ) {
                    value = cursor.value;
                    for ( var i = 0 , il = filters.length ; i < il ; i++ ) {
                        f = filters[ i ];
                        
                        if ( value[ f.field ] !== f.value ) {
                            inc = false;
                        }
                    }
                    
                    if ( inc ) {
                        records.push( value );
                    } else {
                        if ( ~records.indexOf( value ) ) {
                            records = records.slice( 0 , records.indexOf( value ) ).concat( records.indexOf( value ) );
                        }
                    }
                    
                    cursor.continue();
                } else {
                    done( records );
                }
            };
        };
    };
    
    var createSchema = function ( e , schema , db ) {
        if ( typeof schema === 'function' ) {
            schema = schema();
        }
        
        for ( var table in schema ) {
            if ( !Object.prototype.hasOwnProperty.call( schema , table ) ) {
                continue;
            }
            
            db.createObjectStore( table , schema[ table ].key );
        }
    };
    
    var open = function ( e , server , version , ready , schema ) {
        var db = e.target.result;
        var s = new Server( db , server );
        var upgrade;
        
        if ( oldApi && window.parseInt( db.version ) !== version ) {
            upgrade = db.setVersion( version );
            
            upgrade.onsuccess = function ( e ) {
                createSchema( e , schema , db );
                
                var s = new Server ( db , server );
                
                ready( s );
            };
            upgrade.onerror = function () {
                console.log( 'error trying to upgrade database' , arguments );
            };
            
            upgrade.onblocked = function () {
                console.log( 'database blocked and cannot upgrade' , arguments );
            };
        } else {
            ready( s );
        }
        dbCache[ server ] = db;
    };

    var dbCache = {};

    window.db = {
        open: function ( server , version , ready , schema ) {
            var request;
            
            if ( dbCache[ server ] ) {
                open( {
                    target: {
                        result: dbCache[ server ]
                    }
                } , server , version , ready , schema );
            } else {
                request = indexedDB.open( server , version );
                            
                request.onsuccess = function ( e ) {
                    open( e , server , version , ready , schema );
                };
            
                request.onupgradeneeded = createSchema;
                request.onerror = function () {
                    console.log( 'failed to open db' , server , arguments );
                };
            }
        }
    };
})( window );