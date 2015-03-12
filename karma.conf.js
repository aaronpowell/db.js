// Karma configuration
var fs = require('fs');

// Project configuration.
module.exports = function(config) {
  // Use ENV vars on Travis and sauce.js locally to get credentials
  if (process.env.TRAVIS_SECURE_ENV_VARS) {
    process.env.SAUCE_USERNAME = 'aaronpowell';
    process.env.SAUCE_ACCESS_KEY = process.env.saucekey;
  }

  var sauceEnalbe = true;
  if (!process.env.SAUCE_ACCESS_KEY) {
    console.warn('Unable to load saurcelabs key');
    if (!process.env.SAUCE_DISABLE) {
      if (!fs.existsSync('sauce.js')) {
        console.log('Create a sauce.js with your credentials with username, accessKey export');
        process.exit(1);
      }
      process.env.SAUCE_USERNAME = require('./sauce').username;
      process.env.SAUCE_ACCESS_KEY = require('./sauce').accessKey;
      console.log('We have SAUCE_ACCESS_KEY from sauce.js.');
    } else {
      sauceEnalbe = false;
    }
  } else {
    console.log('We have SAUCE_ACCESS_KEY from TRAVIS_SECURE_ENV_VARS.');
  }

  // Browsers to run on Sauce Labs
  var customLaunchers = {
    'SL_Chrome': {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Windows 2008'
    }
  };

  // Start these browsers, currently available:
  // - Chrome
  // - ChromeCanary
  // - Firefox
  // - Opera
  // - Safari (only Mac)
  // - PhantomJS
  // - IE (only Windows)
  var browsers = ['Firefox', 'IE', 'Chrome'];
  if (sauceEnalbe) {
    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers = Object.keys(customLaunchers)
  }

  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  var reporters = sauceEnalbe ? ['dots', 'saucelabs'] : ['progress'];

  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      'bower/es5-shim/es5-shim.js',
      'bower/es5-shim/es5-sham.js',
      'bower/es6-shim/es6-shim.js',
      'bower/es6-shim/es6-sham.js',
      'bower/es6-shim/es6-sham.js',
      'bower/bowser/src/bowser.js',
      'bower/jquery/dist/jquery.min.js',
      'src/*.js',
      //'tests/specs/indexes.js',
      'tests/specs/*.js',
      {pattern: 'tests/*', watched: false, included: false, served: true},
      {pattern: 'bower/**/*', watched: false, included: false, served: true},
    ],

    reporters: reporters,

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    sauceLabs: {
      testName: 'Sauce Labs test for db.js',
      // https://github.com/bermi/sauce-connect-launcher#advanced-usage
      connectOptions: {
      },
    },
    captureTimeout: 120000,
    customLaunchers: customLaunchers,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: !sauceEnalbe,

    browsers: browsers,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: sauceEnalbe
  });
};
