module.exports = function (grunt) {
    'use strict';
    // Project configuration.
    var saucekey = 'auzcE6Esp+TT6vpQHUyWf9jpvYpEO1iHWiMfkZTxo+MsJcETw1qaAakAgyE8jwPFHSPPT6wDzt+rLUOd6FkwqSgm3lLuP9wKgikXzgYSpNg+EfHrF1rep+BVZFkbs3uk6NetezlALVPOMq+4O54TbtOiLF9KurjkM5YkryExCmc=';

    if (!saucekey) {
        console.warn('Unable to load saucelabs key');
    }

    grunt.initConfig({
        jade: {
            release: {
                files: {
                    'tests/index.html': ['tests/views/index.jade']
                }
            }
        },

        clean: ['tests/index.html'],

        connect: {
            server: {
                options: {
                    base: '.',
                    port: 9999
                }
            }
        },

        'saucelabs-jasmine': {
            all: {
                options: {
                    username: 'aaronpowell',
                    key: saucekey,
                    testname: 'db.js',
                    tags: ['master'],
                    urls: ['http://127.0.0.1:9999/tests/index.html'],
                    browsers: [/* {
                        browserName: 'firefox',
                        platform: 'Windows 2012',
                        version: '17'
                    }, {
                        browserName: 'internet explorer',
                        platform: 'Windows 2012',
                        version: '10'
                    }, */
                        {
                            browserName: 'chrome',
                            platform: 'Windows 2008'
                        }]
                }
            }
        },

        'babel': {
            options: {
                sourceMap: true
            },
            dist: {
                files: {
                    'dist/db.js': 'src/db.js'
                }
            }
        },

        'eslint': {
            target: ['src/db.js']
        },

        uglify: {
            options: {
                sourceMap: true,
                sourceMapIncludeSources: true,
                sourceMapIn: 'dist/db.js.map' // input sourcemap from a previous compilation
            },
            dist: {
                files: {
                    'dist/db.min.js': ['dist/db.js']
                }
            }
        }
    });

    // load all grunt tasks
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.registerTask('forever', function () {
        this.async();
    });

    var devJobs = ['eslint', 'babel', 'uglify', 'clean', 'jade'];
    var testJobs = devJobs.concat('connect');
    if (saucekey !== null) {
        testJobs.push('saucelabs-jasmine');
    }

    grunt.registerTask('dev', devJobs);
    grunt.registerTask('test', testJobs);
    grunt.registerTask('default', 'test');
    grunt.registerTask('jasmine-server', function () {
        grunt.task.run(devJobs);
        grunt.task.run('connect:server:keepalive');
    });
};
