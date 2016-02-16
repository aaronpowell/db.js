(function () {
    'use strict'
    importScripts('../../../dist/db.min.js');
    var dbName = 'tests';
    var initialVersion = 1;
    onmessage = function (e) {
        switch (e.data) {
        case 'start':
            db.open({
                server: dbName,
                version: initialVersion
            }).then(function (server) {
                let result = typeof server !== 'undefined';
                server.close(); // Prevent subsequent blocking
                postMessage(result);
            });
            break;
        }
    };
}());
