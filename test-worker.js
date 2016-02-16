(function () {
    'use strict'
    importScripts('dist/db.min.js');
    var dbName = 'tests';
    var initialVersion = 1;
    console.log('00');
    onmessage = function (e) {console.log('0');
        switch (e.data) {
        case 'web worker open':console.log('a');
            db.open({
                server: dbName,
                version: initialVersion
            }).then(function (server) {
                let result = typeof server !== 'undefined';
                server.close(); // Prevent subsequent blocking
                postMessage(result);
            });
            break;
        case 'service worker open':console.log('b');
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
