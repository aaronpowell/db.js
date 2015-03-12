/* global module:false */
module.exports = function(grunt){
  // Project configuration.
  var saucekey = null;
  if (process.env.TRAVIS_SECURE_ENV_VARS) {
    process.env.SAUCE_ENABLE = true;
    process.env.SAUCE_USERNAME = 'aaronpowell';
    process.env.SAUCE_ACCESS_KEY = process.env.saucekey;

    if (!process.env.SAUCE_ACCESS_KEY) {
      console.warn('Unable to load saurcelabs key');
    }
  }

  grunt.initConfig({
    jade: {
      release: {
        files: {
          "tests/index.html": ["tests/views/index.jade"]
        }
      }
    },

    karma: {
      unit: {
        configFile: 'karma.conf.js'
      }
    },

    clean: ["tests/index.html"]
  });

  // The testing URL is http://localhost:9876/base/tests/index.html
  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  var testJobs = ["clean", "jade", "karma"];

  grunt.registerTask('test', testJobs);
  grunt.registerTask('default', 'test');
};

