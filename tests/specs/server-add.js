(function ( db , describe , it , runs , expect , waitsFor , beforeEach , afterEach ) {
    'use strict';
    
    describe( 'server.add' , function () {
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
                    console.log( 'failed to delete db' , arguments );
                };
                
                req.onblocked = function () {
                    console.log( 'db blocked' , arguments , spec );
                };
            });
            
            waitsFor( function () {
                 return done;
            }, 'timed out deleting the database', 1000);
            
            runs( function () {
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
                });
            });
            
            waitsFor( function () { 
                return !!spec.server;
            } , 'wait on db' , 500 );
        });
        
        afterEach( function () {
            var done;

            runs( function () {
                if ( this.server ) {
                    this.server.close();
                }                
                var req = indexedDB.deleteDatabase( dbName );
                
                req.onsuccess = function () {
                    done = true;
                };
                
                req.onerror = function () {
                    console.log( 'failed to delete db' , arguments );
                };
                
                req.onblocked = function () {
                    console.log( 'db blocked' , arguments );
                };
            });
            
            waitsFor( function () {
                 return done;
            }, 'timed out deleting the database', 1000);
        });
           
        it( 'should insert a new item into the object store' , function () {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            
            runs( function () {
                spec.server.add( 'test' , item ).then( function ( records ) {
                    item = records[0];
                });
            });
            
            waitsFor( function () {
                return typeof item.id !== 'undefined';
            } , 'timeout waiting for item to be added' , 1000 );
            
            runs( function () {
                expect( item.id ).toBeDefined();
                expect( item.id ).toEqual( 1 );
            });
        });
        
        it( 'should insert multiple records' , function () {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'John',
                lastName: 'Smith'
            };
            
            var spec = this;
            
            runs( function () {
                spec.server.add( 'test' , item1 , item2 );
            });
            
            waitsFor( function () {
                return typeof item2.id !== 'undefined';
            } , 'timed out waiting for items to be added' , 1000 );
            
            runs( function () {
                expect( item1.id ).toBeDefined();
                expect( item1.id ).toEqual( 1 );
                expect( item2.id ).toBeDefined();
                expect( item2.id ).toEqual( 2 );
            });
        });
    });

    describe( 'server.add-non-autoincrement key' , function () {
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
                    console.log( 'failed to delete db' , arguments );
                };
                
                req.onblocked = function () {
                    console.log( 'db blocked' , arguments , spec );
                };
            });
            
            waitsFor( function () {
                 return done;
            }, 'timed out deleting the database', 1000);
            
            runs( function () {
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
                });
            });
            
            waitsFor( function () { 
                return !!spec.server;
            } , 'wait on db' , 500 );
        });
        
        afterEach( function () {
            var done;

            runs( function () {
                if ( this.server ) {
                    this.server.close();
                }                
                var req = indexedDB.deleteDatabase( dbName );
                
                req.onsuccess = function () {
                    done = true;
                };
                
                req.onerror = function () {
                    console.log( 'failed to delete db' , arguments );
                };
                
                req.onblocked = function () {
                    console.log( 'db blocked' , arguments );
                };
            });
            
            waitsFor( function () {
                 return done;
            }, 'timed out deleting the database', 1000);
        });

        it( 'should insert a new item into the object store' , function () {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell',
                id: 'abcd'
            };
            
            var spec = this;
            var done;
            
            runs( function () {
                spec.server.add( 'test' , item ).then( function ( records ) {
                    done = true;
                    item = records[0];
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for item to be added' , 1000 );
            
            runs( function () {
                expect( item.id ).toBeDefined();
                expect( item.id ).toEqual( 'abcd' );
            });
        });
    });

    describe( 'server.add no keyPath' , function () {
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
                    console.log( 'failed to delete db' , arguments );
                };
                
                req.onblocked = function () {
                    console.log( 'db blocked' , arguments , spec );
                };
            });
            
            waitsFor( function () {
                 return done;
            }, 'timed out deleting the database', 1000);
            
            runs( function () {
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
                });
            });
            
            waitsFor( function () { 
                return !!spec.server;
            } , 'wait on db' , 500 );
        });
        
        afterEach( function () {
            var done;

            runs( function () {
                if ( this.server ) {
                    this.server.close();
                }                
                var req = indexedDB.deleteDatabase( dbName );
                
                req.onsuccess = function () {
                    done = true;
                };
                
                req.onerror = function () {
                    console.log( 'failed to delete db' , arguments );
                };
                
                req.onblocked = function () {
                    console.log( 'db blocked' , arguments );
                };
            });
            
            waitsFor( function () {
                 return done;
            }, 'timed out deleting the database', 1000);
        });

        it( 'should insert a new item into the object store' , function () {
            var item = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            var done;
            
            runs( function () {
                spec.server.add( 'test' , item ).then( function ( records ) {
                    done = true;
                    item = records[0];
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for item to be added' , 1000 );
            
            runs( function () {
                expect( item.__id__ ).toBeDefined();
                expect( item.__id__ ).toEqual( 1 );
            });
        });

        it( 'should insert multiple items into the object store' , function () {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            var done;
            
            runs( function () {
                spec.server.add( 'test' , item1 , item2 ).then( function ( records ) {
                    done = true;
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for item to be added' , 1000 );
            
            runs( function () {
                expect( item1.__id__ ).toBeDefined();
                expect( item1.__id__ ).toEqual( 1 );
                expect( item2.__id__ ).toBeDefined();
                expect( item2.__id__ ).toEqual( 2 );
            });
        });

        it( 'should insert multiple items into the object store, using an array' , function () {
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
            var done;
            
            runs( function () {
                spec.server.add( 'test' , items ).then( function ( records ) {
                    done = true;
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for item to be added' , 1000 );
            
            runs( function () {
                expect( items[0].__id__ ).toBeDefined();
                expect( items[0].__id__ ).toEqual( 1 );
                expect( items[1].__id__ ).toBeDefined();
                expect( items[1].__id__ ).toEqual( 2 );
            });
        });

        it( 'should insert an item with a provided key into the object store' , function () {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            var done;
            
            runs( function () {
                spec.server.add( 'test' , {
                    item: item1,
                    key: 1.001
                } ).then( function ( records ) {
                    done = true;
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for item to be added' , 1000 );
            
            runs( function () {
                expect( item1.__id__ ).toBeDefined();
                expect( item1.__id__ ).toEqual( 1.001 );
            });
        });

        it( 'should insert an item with a provided string key into the object store' , function () {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            var done;
            
            runs( function () {
                spec.server.add( 'test' , {
                    item: item1,
                    key: 'key'
                } ).then( function ( records ) {
                    done = true;
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for item to be added' , 1000 );
            
            runs( function () {
                expect( item1.__id__ ).toBeDefined();
                expect( item1.__id__ ).toEqual( 'key' );
            });
        });

        it( 'should insert multiple items with the provided keys into the object store' , function () {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var item2 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            
            var spec = this;
            var done;
            
            runs( function () {
                spec.server.add( 'test' , {
                    item: item1,
                    key: 'key'
                } , {
                    item: item2,
                    key: 5
                } ).then( function ( records ) {
                    done = true;
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for item to be added' , 1000 );
            
            runs( function () {
                expect( item1.__id__ ).toBeDefined();
                expect( item1.__id__ ).toEqual( 'key' );
                expect( item2.__id__ ).toBeDefined();
                expect( item2.__id__ ).toEqual( 5 );
            });
        });

        it( 'should insert multiple items with mixed key generation' , function () {
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
            var done;
            
            runs( function () {
                spec.server.add( 'test' , item1 , {
                    item: item2,
                    key: 5
                } , item3 ).then( function ( records ) {
                    done = true;
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for item to be added' , 1000 );
            
            runs( function () {
                expect( item1.__id__ ).toBeDefined();
                expect( item1.__id__ ).toEqual( 1 );
                expect( item2.__id__ ).toBeDefined();
                expect( item2.__id__ ).toEqual( 5 );
                expect( item3.__id__ ).toBeDefined();
                expect( item3.__id__ ).toEqual( 6 );
            });
        });

        it( 'should should error when adding an item with an existing key' , function () {
            var item1 = {
                firstName: 'Aaron',
                lastName: 'Powell'
            };
            var key = 'key';
            
            var spec = this;
            var done;
            
            runs( function () {
                spec.server.add( 'test' , {
                    item: item1,
                    key: key
                } ).then( function ( records ) {
                    done = true;
                });
            });
            
            waitsFor( function () {
                return done;
            } , 'timeout waiting for item to be added' , 1000 );
            
            runs( function () {
                done = false;

                spec.server.add( 'test' , {
                    item: item1,
                    key: key
                } ).then( function ( records ) {
                    //done = true;
                }).catch( function ( e ) {
                    expect( e.target.error.name ).toBe( 'ConstraintError' );
                    done = true;
                });
            });

            waitsFor( function () {
                return done;
            } , 'timeout waiting for item add to fail' , 1000 );
        });
    });

})( window.db , window.describe , window.it , window.runs , window.expect , window.waitsFor , window.beforeEach , window.afterEach );
