// Karma configuration
// Generated on Fri Feb 26 2016 11:48:37 GMT+1100 (AUS Eastern Summer Time)

module.exports = function (config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        client: {
            captureConsole: true,
            mocha: {
                bail: true
            }
        },

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha'],

        // list of files / patterns to load in the browser
        files: [
            'dist/db.min.js',
            'node_modules/chai/chai.js',
            'node_modules/babel-polyfill/dist/polyfill.js',
            'node_modules/jquery/dist/jquery.min.js',
            'tests/helpers/**/*.js',
            'tests/specs/**/*.js',
            'tests/test-worker.js',
            'tests/helpers/other-dbjs-instance.html'
        ],

        // list of files to exclude
        exclude: [
        ],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            '**/*.js': ['replacer']
        },

        replacerPreprocessor: {
            replacer: function (file, content) {
                return content
                        // PhantomJS has issue with paths: https://github.com/ariya/phantomjs/issues/14119
                        .replace(/(importScripts\(")\//g, '$1../')
                        .replace(/(new Worker\(')/g, '$1/base/tests/')
                        .replace(/(ifr\.src = ')(helpers\/other-dbjs-instance\.html')/, '$1base/tests/$2')
                        // PhantomJS has issue with frames and `postMessage` (perhaps partly related to the frame loading first): https://github.com/ariya/phantomjs/issues/14127
                        .replace(/ifr\.contentWindow(\.postMessage)/, 'self$1')
                        .replace(/parent(\.postMessage)/g, 'self$1')
                        // PhantomJS gets blocked events even when versionchange event handlers close connections: https://github.com/ariya/phantomjs/issues/14126
                        .replace(/\}\)\.then\(function \(s\) \{ \/\/ Chrome and Firefox/g, '}).catch(function (err) {if (err.type === \'blocked\') {return err.resume;}\n' + ' '.repeat(20) + '$&')
                        // Apparently an access issue here; colon being added to URL; for a more complete solution, see https://www.npmjs.com/package/karma-json-fixtures-preprocessor
                        .replace(/\$\.getJSON\('foo'\);/g, '$.Deferred().resolve();')
                        // Karma or PhantomJS is executing twice, once in window scope without importScripts: https://github.com/karma-runner/karma/issues/1518
                        .replace(/(importScripts\("\.\.\/node_modules)/, 'if (typeof importScripts !== \'function\') {return;}\n$1')
                        // Escape tests for sake of PhantomJS: https://github.com/ariya/phantomjs/issues/14118
                        .replace(/(navigator\.serviceWorker\.register)/g, 'if (!navigator.serviceWorker) {done();return;}\n$1');
            }
        },

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress'],

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['PhantomJS'],

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: Infinity,

        customLaunchers: {
            'PhantomJS_custom': {
                base: 'PhantomJS',
                options: {
                    windowName: 'my-window'
                },
                flags: ['--load-images=true'],
                debug: true
            }

        }
    });
};
