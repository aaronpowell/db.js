(function ( window ) {
    'use strict';
    var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB,
        IDBDatabase = window.IDBDatabase || window.webkitIDBDatabase,
        IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange,
        transactionModes = {
            readonly: 'readonly',
            readwrite: 'readwrite'
        };
        
    var hasOwn = Object.prototype.hasOwnProperty;

    var oldApi = !!IDBDatabase.prototype.setVersion;

    if ( !indexedDB ) {
        throw 'IndexedDB required';
    }

    var CallbackList = function () {
        var state,
            list = [];

        var exec = function ( context , args ) {
            if ( list ) {
                args = args || [];
                state = state || [ context , args ];

                for ( var i = 0 , il = list.length ; i < il ; i++ ) {
                    list[ i ].apply( state[ 0 ] , state[ 1 ] );
                }

                list = [];
            }
        };

        this.add = function () {
            for ( var i = 0 , il = arguments.length ; i < il ; i ++ ) {
                list.push( arguments[ i ] );
            }

            if ( state ) {
                exec();
            }

            return this;
        };

        this.execute = function () {
            exec( this , arguments );
            return this;
        };
    };

    var Promise = function () {
        var doneList = new CallbackList(),
            failedList = new CallbackList(),
            progressList = new CallbackList(),
            state = 'progress';

        this.done = doneList.add;
        this.fail = failedList.add;
        this.progress = progressList.add;
        this.resolve = doneList.execute;
        this.reject = failedList.execute;
        this.notify = progressList.execute;

        this.then = function ( doneHandler , failedHandler , progressHandler ) {
            return this.done( doneHandler ).fail( failedHandler ).progress( progressHandler );
        };

        this.done( function () { 
            state = 'resolved';
        }).fail( function () {
            state = 'rejected';
        });
    };

    var Server = function ( db , name ) {
        var that = this,
            closed = false;
        
        this.add = function( table , records ) {
            if ( closed ) {
                throw 'Database has been closed';
            }
            var transaction = db.transaction( table , transactionModes.readwrite ),
                store = transaction.objectStore( table ),
                promise = new Promise();
            
            if ( records.constructor !== Array ) {
                records = [ records ];
            }
            
            records.forEach( function ( record ) {
                var req = store.add( record );
                req.onsuccess = function ( e ) {
                    var target = e.target;
                    record[ target.source.keyPath ] = target.result;
                    promise.notify();
                };
            } );
            
            transaction.oncomplete = function () {
                promise.resolve( records , that );
            };
            transaction.onerror = function ( e ) {
                promise.reject( records , e );
            };
            transaction.onabort = function ( e ) {
                promise.reject( records , e );
            };
            return promise;
        };
        
        this.remove = function ( table , key ) {
            if ( closed ) {
                throw 'Database has been closed';
            }
            var transaction = db.transaction( table , transactionModes.readwrite ),
                store = transaction.objectStore( table ),
                promise = new Promise();
            
            var req = store.delete( key );
            req.onsuccess = function ( e ) {
                promise.resolve( key );
            };
            req.onerror = function ( e ) {
                promise.reject( e );
            };
            return promise;
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

        this.get = function ( table , id ) {
            if ( closed ) {
                throw 'Database has been closed';
            }
            var transaction = db.transaction( table ),
                store = transaction.objectStore( table ),
                promise = new Promise();

            var req = store.get( id );
            req.onsuccess = function ( e ) {
                promise.resolve( e.target.result );
            };
            req.onerror = function ( e ) {
                promise.reject( e );
            };
            return promise;
        };

        this.index = function ( table , index ) {
            if ( closed ) {
                throw 'Database has been closed';
            }
            return new IndexQuery( table , db , index );
        };

        for ( var i = 0 , il = db.objectStoreNames.length ; i < il ; i++ ) {
            (function ( storeName ) {
                that[ storeName ] = { };
                for ( var i in that ) {
                    if ( !hasOwn.call( that , i ) || i === 'close' ) {
                        continue;
                    }
                    that[ storeName ][ i ] = (function ( i ) {
                        return function () {
                            var args = [ storeName ].concat( [].slice.call( arguments , 0 ) );
                            return that[ i ].apply( that , args );
                        };
                    })( i );
                }
            })( db.objectStoreNames[ i ] );
        }
    };

    var IndexQuery = function ( table , db , indexName ) {
        var that = this;
        var runQuery = function ( type, args , cursorType ) {
            var transaction = db.transaction( table ),
                store = transaction.objectStore( table ),
                index = indexName ? store.index( indexName ) : store,
                keyRange = type ? IDBKeyRange[ type ].apply( null, args ) : undefined,
                results = [],
                promise = new Promise();

            ( keyRange ? index[cursorType]( keyRange ) : index[cursorType]( ) ).onsuccess = function ( e ) {
                var cursor = e.target.result;

                if ( typeof cursor === typeof 0 ) {
                    results = cursor;
                } else if ( cursor ) {
                    results.push( 'value' in cursor ? cursor.value : cursor.key );
                    cursor.continue();
                }
            };

            transaction.oncomplete = function () {
                promise.resolve( results );
            };
            transaction.onerror = function ( e ) {
                promise.reject( e );
            };
            transaction.onabort = function ( e ) {
                promise.reject( e );
            };
            return promise;
        };

        var Query = function ( type , args ) {
            return {
                execute: function () {
                    return runQuery( type , args , 'openCursor' );
                },
                count: function () {
                    return runQuery( type , args , 'count' );
                },
                keys: function () {
                    return runQuery( type , args , 'openKeyCursor' );
                },
                filter: function ( fn ) {
                    var promise = new Promise();

                    runQuery( type , args , 'openCursor' ).then( function ( data ) {
                        var results = data.filter( fn );
                        promise.resolve( results );
                    }, promise.reject , promise.progress );

                    return promise;
                }
            }
        };
        
        'only bound upperBound lowerBound'.split(' ').forEach(function (name) {
            that[name] = function () {
                return new Query( name , arguments );
            };
        });

        this.filter = function ( fn ) {
            var promise = new Promise();
            runQuery( null , null , 'openCursor' ).done( function ( data ) {
                var results = data.filter( fn );
                promise.resolve( results );
            }, promise.reject , promise.progress );
            return promise;
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
        
        this.execute = function () {
            var records = [],
                transaction = db.transaction( table ),
                store = transaction.objectStore( table ),
                req = store.openCursor(),
                promise = new Promise();

            req.onsuccess = function ( e ) {
                var value, f,
                    inc = true,
                    cursor = e.target.result;
                
                if ( cursor ) {
                    value = cursor.value;
                    for ( var i = 0 , il = filters.length ; i < il ; i++ ) {
                        f = filters[ i ];
                        if (typeof f.field === 'function') {
                            inc = f.field(value);
                        } else if (value[f.field] !== f.value) {
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
                    promise.resolve( records );
                }
            };

            req.onerror = function ( e ) {
                promise.reject( e );
            };
            transaction.onabort = function ( e ) {
                promise.reject( e );
            };

            return promise;
        };
    };
    
    var createSchema = function ( e , schema , db ) {
        if ( typeof schema === 'function' ) {
            schema = schema();
        }
        
        for ( var tableName in schema ) {
            var table = schema[ tableName ];
            if ( !hasOwn.call( schema , tableName ) ) {
                continue;
            }
            
            var store = db.createObjectStore( tableName , table.key );

            for ( var indexKey in table.indexes ) {
                var index = table.indexes[ indexKey ];
                store.createIndex( indexKey , index.key || indexKey , index.options || { unique: false } );
            }
        }
    };
    
    var open = function ( e , server , version , schema ) {
        var db = e.target.result;
        var s = new Server( db , server );
        var upgrade;

        var promise = new Promise();
        
        if ( oldApi && window.parseInt( db.version ) !== version ) {
            upgrade = db.setVersion( version );
            
            upgrade.onsuccess = function ( e ) {
                createSchema( e , schema , db );
                                
                promise.resolve( s );
            };
            upgrade.onerror = function ( e ) {
                promise.reject( e );
            };
            
            upgrade.onblocked = function () {
                promise.reject( e );
            };
        } else {
            promise.resolve( s );
        }
        dbCache[ server ] = db;

        return promise;
    };

    var dbCache = {};

    window.db = {
        open: function ( options ) {
            var request;

            var promise = new Promise();

            if ( dbCache[ options.server ] ) {
                open( {
                    target: {
                        result: dbCache[ options.server ]
                    }
                } , options.server , options.version , options.schema )
                .done(promise.resolve)
                .fail(promise.reject)
                .progress(promise.notify);
            } else {
                request = indexedDB.open( options.server , options.version );
                            
                request.onsuccess = function ( e ) {
                    open( e , options.server , options.version , options.schema )
                        .done(promise.resolve)
                        .fail(promise.reject)
                        .progress(promise.notify);
                };
            
                request.onupgradeneeded = function ( e ) {
                    createSchema( e , options.schema , e.target.result );
                };
                request.onerror = function ( e ) {
                    promise.reject( e );
                };
            }

            return promise;
        }
    };
})( window );
