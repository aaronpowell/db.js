// Karma configuration
var fs = require('fs');

module.exports = function(config) {

  var sauceEnalbe = true;
  // Use ENV vars on Travis and sauce.json locally to get credentials
  if (!process.env.SAUCE_ACCESS_KEY) {
    if (process.env.SAUCE_ENABLE) {
      if (!fs.existsSync('sauce.json')) {
        console.log('Create a sauce.json with your credentials based on the sauce-sample.json file.');
        process.exit(1);
      }
    } else {
      sauceEnalbe = false;
    }
  }

  // Browsers to run on Sauce Labs
  var customLaunchers = {
    'SL_Chrome': {
      base: 'SauceLabs',
      browserName: 'chrome'
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
  var browsers = ['Chrome'];
  if (sauceEnalbe) {
    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers = Object.keys(customLaunchers)
  }

  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  var reporters = sauceEnalbe ? ['progress'] : ['dots', 'saucelabs'];

  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      'bower/jquery/dist/jquery.min.js',
      'src/*.js',
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
      testName: 'Sauce Labs test for db.js'
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
