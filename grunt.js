/* global module:false */
module.exports = function(grunt){
	// Project configuration.
	var saucekey = null;
	if (process.env.TRAVIS_SECURE_ENV_VARS) {
		saucekey = process.env.saucekey;
	}

	if (!saucekey) {
		throw 'Unable to load saurcelabs key';
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
		
		server: {
			base: ".",
			port: 9999
		},
		
		'saucelabs-jasmine': {
			all: {
				username: 'aaronpowell',
				key: saucekey,
				testname: 'db.js',
				tags: ['master'],
				urls: ['http://127.0.0.1:9999/tests/index.html'],
				browsers: [{
					browserName: 'firefox',
					platform: 'Windows 2012',
					version: '17'
				}, {
					browserName: 'internet explorer',
					platform: 'Windows 2012',
					version: '10'
				}, {
					browserName: 'chrome',
					platform: 'Windows 2008'
				}]
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-saucelabs');
	grunt.loadNpmTasks('grunt-contrib');
	
	grunt.registerTask("forever", function(){
		this.async();
	});
	
	var testJobs = ["jade", "server"];
	if (saucekey !== null) {
		testJobs.push("saucelabs-jasmine");
	}
	
	grunt.registerTask('test', testJobs.join(" "));
	grunt.registerTask('default', 'test');
};

