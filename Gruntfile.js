module.exports = function (grunt) {
    'use strict';
    // Project configuration.
    var saucekey = process.env.saucekey;

    if (!saucekey) {
        console.warn('Unable to load Saucelabs key');
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

        'saucelabs-mocha': {
            all: {
                options: {
                    username: process.env.sauceuser,
                    key: saucekey,
                    testname: 'db.js',
                    tags: ['master'],
                    urls: ['http://127.0.0.1:9999/tests/index.html'],
                    public: !!process.env.TRAVIS_JOB_ID,
                    build: process.env.TRAVIS_JOB_ID,
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
                },
                onTestComplete: function (result, callback) {
                    console.dir(result);
                }
            }
        },

        karma: {
            options: {
                configFile: 'karma.conf.js'
            },
            ci: {
                singleRun: true,
                browsers: ['PhantomJS']
            },
            dev: {
                singleRun: false,
                browsers: ['PhantomJS']
            },
            'dev-single': {
                singleRun: true,
                browsers: ['PhantomJS']
            }
        },

        eslint: {
            target: ['src/db.js', 'src/test-worker.js']
        },

        babel: {
            options: {
                sourceMap: true
            },
            dist: {
                files: {
                    'dist/db.js': 'src/db.js',
                    'tests/test-worker.js': 'src/test-worker.js'
                }
            }
        },

        browserify: {
            dist: {
                files: {
                    'dist/db.js': 'dist/db.js'
                },
                options: {
                    browserifyOptions: {
                        standalone: 'db'
                    }
                }
            }
        },

        uglify: {
            options: {
                sourceMap: true,
                sourceMapIncludeSources: true
            },
            dbjs: {
                options: {
                    sourceMapIn: 'dist/db.js.map' // input sourcemap from a previous compilation
                },
                files: {
                    'dist/db.min.js': ['dist/db.js']
                }
            },
            testworker: {
                options: {
                    sourceMapIn: 'tests/test-worker.js.map' // input sourcemap from a previous compilation
                },
                files: {
                    'tests/test-worker.js': ['tests/test-worker.js']
                }
            }
        }
    });

    // load all grunt tasks
    require('matchdep').filterDev(['grunt-*', '!grunt-cli']).forEach(grunt.loadNpmTasks);

    grunt.registerTask('forever', function () {
        this.async();
    });

    var devJobs = ['eslint', 'babel', 'browserify', 'uglify', 'clean', 'jade'];
    var karmaJobs = devJobs.slice();
    if (process.env.TRAVIS_JOB_ID) {
        karmaJobs.push('karma:ci');
    } else {
        karmaJobs.push('karma:dev-single');
    }

    grunt.registerTask('dev', devJobs);
    grunt.registerTask('phantom', karmaJobs);
    grunt.registerTask('test', function () {
        var testJobs = karmaJobs.concat('connect');
        if (saucekey && !process.env.TRAVIS_PULL_REQUEST) {
            console.info('adding Saucelabs integration');
            testJobs.push('saucelabs-mocha');
        }
        grunt.task.run(testJobs);
    });
    grunt.registerTask('default', 'test');
    grunt.registerTask('test:local', function () {
        grunt.task.run(devJobs);
        grunt.task.run('connect:server:keepalive');
    });
};
