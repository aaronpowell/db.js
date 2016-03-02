(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('web workers', function () {
        var initialVersion = 1;
        var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            this.dbName = guid();
            var req = indexedDB.deleteDatabase(this.dbName);

            req.onsuccess = function () {
                done();
            };

            req.onerror = function (e) {
                console.log('error deleting db', arguments);
                done(e);
            };

            req.onblocked = function (e) {
                console.log('db blocked on delete', arguments);
                done(e);
            };
        }, 10000);

        afterEach(function (done) {
            if (this.server && !this.server.isClosed()) {
                this.server.close();
            }
            var req = indexedDB.deleteDatabase(this.dbName);

            req.onsuccess = function (/* e */) {
                done();
            };

            req.onerror = function (e) {
                console.log('failed to delete db', arguments);
                done(e);
            };

            req.onblocked = function (e) {
                console.log('db blocked', arguments);
                done(e);
            };
        });

        it('should open a created db in a web worker', function (done) {
            var tw = new Worker('../test-worker.js');
            tw.onmessage = function (e) {
                expect(e.data).to.be.true;
                tw.terminate();
                done();
            };
            tw.postMessage({dbName: this.dbName, message: 'web worker open', version: initialVersion});
        });

        it('should open a created db in a service worker', function (done) {
            var spec = this;
            navigator.serviceWorker.register('../test-worker.js').then(function() {
                return navigator.serviceWorker.ready;
            }).then(function (serviceWorker) {
                var messageChannel = new MessageChannel();
                messageChannel.port1.onmessage = function(e) {
                    expect(e.data).to.be.true;
                    done();
                };

                var controller = navigator.serviceWorker.controller || serviceWorker.active;

                controller.postMessage(
                    {dbName: spec.dbName, message: 'service worker open', version: initialVersion},
                    [messageChannel.port2]
                );
            }).catch(function (err) {
                console.log('Service worker error: ' + err);
            });
        });
    });
})(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach);
