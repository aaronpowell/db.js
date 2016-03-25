/*global db*/
(function () {
    'use strict';

    var initialVersion = 1;
    var schema = {
        test: {
            key: {
                keyPath: 'id',
                autoIncrement: true
            },
            indexes: {
                firstName: {},
                age: {},
                specialID: {unique: true}
            }
        }
    };

    self.addEventListener('message', function (e) {
        var ourOrigin = window.location.origin;
        if (e.origin !== ourOrigin || !Array.isArray(e.data) || e.data[0] !== 'start') {
            return;
        }
        db.open({
            server: e.data[1],
            version: initialVersion,
            schema: schema
        }).then(function (server) {
            var handler1 = false;
            var handler2 = false;
            function close () {
                if (handler1 && handler2) {
                    server.close();
                    parent.postMessage('versionchange2-fired-and-finished', ourOrigin);
                }
            }
            server.addEventListener('versionchange', function () {
                handler1 = true;
                close();
            });
            server.versionchange(function () {
                handler2 = true;
                close();
            });
            parent.postMessage('versionchange-listeners2-ready', ourOrigin); // Needed by PhantomJS but not Chrome
        });
    });
    parent.postMessage('message-listeners2-ready', window.location.origin);
}());
