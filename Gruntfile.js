/* global module:false */
module.exports = function(grunt){
	// Project configuration.
	var saucekey = null;
	if (process.env.TRAVIS_SECURE_ENV_VARS) {
		saucekey = process.env.saucekey;
	}

	if (!saucekey) {
		console.warn('Unable to load saurcelabs key');
	}
	
	grunt.initConfig({
		jade: {
			release: {
				files: {
					"tests/index.html": ["tests/views/index.jade"]
				}
			}
		},
		
		clean: ["tests/index.html"],
		
		connect: {
			server: {
				options: {
					base: ".",
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
					browsers: [/*{
						browserName: 'firefox',
						platform: 'Windows 2012',
						version: '17'
					}, {
						browserName: 'internet explorer',
						platform: 'Windows 2012',
						version: '10'
					}, */{
						browserName: 'chrome',
						platform: 'Windows 2008'
					}]
				}
			}
		}
	});

  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);
	
	grunt.registerTask("forever", function(){
		this.async();
	});
	
	var testJobs = ["clean", "jade", "connect"];
	if (saucekey !== null) {
		testJobs.push("saucelabs-jasmine");
	}
	
	grunt.registerTask('test', testJobs);
	grunt.registerTask('default', 'test');
};

