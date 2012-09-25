db.js
=====

db.js is a wrapper for [IndexedDB](http://www.w3.org/TR/IndexedDB/) to make it easier to work against, making it look more like a queryable API.

Usage
====

Add a reference to db.js in your application before you want to use IndexedDB:

	<script src='/scripts/db.js'></script>

Once you have the script included you can then open connections to each different database within your application:

	var server;
	db.open( {
	    server: 'my-app',
	    version: 1,
	    schema: {
	        people: {
	            key: { keyPath: 'id' , autoIncrement: true },
	            // Optionally add indexes
	            indexes: {
	                firstName: { },
	                answer: { unique: true }
	            }
	        }
	    }
	} ).done( function ( s ) {
	    server = s
	} );

A connection is intended to be persisted and you can perform multiple operations while it's kept open. Check out the `/tests/public/specs` folder for more examples.

## General

Note that the methods below can be called either as `server.people.xxx( arg1, arg2, ... )` or `server.xxx( 'people', arg1, arg2, ... )`.

## Adding items

	server.people.add( {
	    firstName: 'Aaron',
	    lastName: 'Powell',
	    answer: 42
	} ).done( function ( item ) {
	    // item stored
	} );

## Removing

	server.people.remove( 1 ).done( function ( key ) {
	    // item removed
	} );

## Fetching

### Getting a single object by ID

	server.people.query( 'firstName' , 'Aaron' )
	      .execute()
	      .done( function ( results ) {
	          // do something with the results
	      } );

### Querying all objects, with optional filtering

	server.people.query()
	      .filter( 'firstName', 'Aaron' )
	      .execute()
	      .done( function ( results ) {
	          // do something with the results
	      } );

### Querying using indexes

All ranges supported by IDBKeyRange can be used.

	server.people.index()
	      .only( 'firstName', 'Aaron' )
	      .done( function ( results ) {
	          //do something with the results
	      } );

	server.people.index()
	      .bound( 'answer', 30, 50 )
	      .done( function ( results ) {
	          //do something with the results
	      } );

## Closing connection

	server.close();

The MIT License

Copyright (c) 2012 Aaron Powell
