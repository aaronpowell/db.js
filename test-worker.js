(function () {
    'use strict'
    importScripts('dist/db.min.js');
    var dbName = 'tests';
    var initialVersion = 1;
    onmessage = function (e) {
        switch (e.data) {
        case 'web worker open':
            db.open({
                server: dbName,
                version: initialVersion
            }).then(function (server) {
                let result = typeof server !== 'undefined';
                server.close(); // Prevent subsequent blocking
                postMessage(result);
            });
            break;
        case 'service worker open':
            db.open({
                server: dbName,
                version: initialVersion
            }).then(function (server) {
                let result = typeof server !== 'undefined';
                server.close(); // Prevent subsequent blocking
                e.ports[0].postMessage(result);
            });
            break;
        }
    };
}());
