var express = require('express');
var app = module.exports = express.createServer();
var fs = require('fs');

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});
app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});
app.configure('production', function(){
    app.use(express.errorHandler());
});

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/db.js', function (req, res) {
	fs.readFile(__dirname + '/../src/db.js', function ( err , data ) {
		res.type( 'application/javascript' );
		res.send( 200 , data );
	});
});

app.listen(process.env.PORT || 3000);