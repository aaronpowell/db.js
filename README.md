db.js
=====

db.js is a wrapper for [IndexedDB](http://www.w3.org/TR/IndexedDB/) to make it easier to work against, making it look more like a queryable API.

Usage
====

Add a reference to db.js in your application before you want to use IndexedDB:

	<script src='/scripts/db.js'></script>
	
Once you have the script included you can then open connections to each different database within your application:

	var server;
	db.open({
         server: 'my-app',
         version: 1, {
             people: {
                 key: { keyPath: 'id' , autoIncrement: true }
             }
         }
    }).done( function ( s ) {
    	server = s	
	});
	
A connection is intended to be persisted and you can perform multiple operations while it's kept open. Check out the `/tests/public/spec` folder for more examples.

## Adding items

	server.people.add( {
	    firstName: 'Aaron',
	    lastName: 'Powell'
	} ).done( function ( item ) {
	    //item stored
	});
	
## Removing

	server.people.remove( 1 ).done( function ( item ) {
	    //item stored
	});

## Querying

	server.people.query( 'firstName' , 'Aaron' )
        .execute()
        .done( function ( results ) {
            //do something with the results
        });

The MIT License

Copyright (c) 2012 Aaron Powell