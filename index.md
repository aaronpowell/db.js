---
layout: default
---

db.js
=====

db.js is a wrapper for [IndexedDB](http://www.w3.org/TR/IndexedDB/) to make it easier to work against, making it look more like a queryable API.

Usage
====

Add a reference to db.js in your application before you want to use IndexedDB:

<pre>
  <code class="language-html">
    &lt;script src='/scripts/db.js'&gt;&lt;/script&gt;
  </code>
</pre>

Alternatively, db.js includes an optional `define` call, and can be loaded as module using the [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) loader of your choice.

Once you have the script included you can then open connections to each different database within your application:

<pre>
  <code class="language-js">
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
  </code>
</pre>

A connection is intended to be persisted and you can perform multiple operations while it's kept open. Check out the `/tests/public/specs` folder for more examples.

## General

Note that the methods below can be called either as `server.people.xxx( arg1, arg2, ... )` or `server.xxx( 'people', arg1, arg2, ... )`.

## Adding items

<pre>
  <code class="language-js">
  server.people.add( {
      firstName: 'Aaron',
      lastName: 'Powell',
      answer: 42
  } ).done( function ( item ) {
      // item stored
  } );
  </code>
</pre>

## Removing

<pre>
  <code class="language-js">
  server.people.remove( 1 ).done( function ( key ) {
      // item removed
  } );
  </code>
</pre>

## Fetching

### Getting a single object by ID

<pre>
  <code class="language-js">
  server.people.query( 'firstName' , 'Aaron' )
        .execute()
        .done( function ( results ) {
            // do something with the results
        } );
  </code>
</pre>

### Querying all objects, with optional filtering

<pre>
  <code class="language-js">
  server.people.query()
        .filter( 'firstName', 'Aaron' )
        .execute()
        .done( function ( results ) {
            // do something with the results
        } );
  </code>
</pre>

### Querying using indexes

All ranges supported by IDBKeyRange can be used.

<pre>
  <code class="language-js">
  server.people.query( 'indexName' )
        .only( 'firstName', 'Aaron' )
        .execute()
        .done( function ( results ) {
            //do something with the results
        } );

  server.people.query( 'indexName' )
        .bound( 'answer', 30, 50 )
        .execute()
        .done( function ( results ) {
            //do something with the results
        } );
  </code>
</pre>

## Closing connection

<pre>
  <code class="language-js">
  server.close();
  </code>
</pre>

# Deferred/ Promise notes

db.js used the Promise spec to handle asynchronous operations. All operations that are asynchronous will return an instance of the internal Promise object that exposes a `then` method which will take up to three callbacks, `success`, `failed` and `progress`. It also exposes useful helpers for these such as `done`, `fail` and `progress`.

As of version `0.7.0` db.js's Promise API is designed to work with jQuery*, allowing you to link db.js Promises with other Promises.

*_Note: It's likely that other Promise libraries also integrate with it, jQuery is just the only tested on._

The MIT License

Copyright (c) 2012 Aaron Powell