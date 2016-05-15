/*global importScripts, db */
(function () {
    'use strict';
    importScripts('/node_modules/babel-polyfill/dist/polyfill.js');
    self._babelPolyfill = false; // Hack for babel polyfill which checks for there being only one instance per this flag
    importScripts('/dist/db.min.js');
    self.onmessage = function (e) {
        var dbName = e.data.dbName;
        var msg = e.data.message;
        var version = e.data.version;
        switch (msg) {
        case 'web worker open':
            db.open({
                server: dbName,
                version: version
            }).then(function (server) {
                let result = typeof server !== 'undefined';
                server.close(); // Prevent subsequent blocking
                postMessage(result);
            });
            break;
        case 'service worker open':
            db.open({
                server: dbName,
                version: version
            }).then(function (server) {
                let result = typeof server !== 'undefined';
                server.close(); // Prevent subsequent blocking
                e.ports[0].postMessage(result);
            });
            break;
        }
    };
}());
