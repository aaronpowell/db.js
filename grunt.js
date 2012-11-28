/* global module:false */
module.exports = function(grunt){
	// Project configuration.
	var saucekey = null;
	if (process.env.TRAVIS_SECURE_ENV_VARS) {
		saucekey = process.env.saucekey;
	}
	saucekey = '02c94a66-b6f2-421e-9370-0cbc249337e2';
	
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
				username: 'parashu',
				key: saucekey,
				testname: 'db.js',
				tags: ['master'],
				urls: ['http://127.0.0.1:9999/tests/index.html'],
				browsers: [{
					browserName: 'firefox',
					platform: 'Windows 2012',
					version: '17'
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

