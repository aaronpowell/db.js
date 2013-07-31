var express = require('express');
var app = module.exports = express();
var fs = require('fs');
var path = require('path');

app.set('views', path.join(__dirname, 'views'));
app.use('/lib', express.static(path.join(__dirname, 'lib')));
app.use('/specs', express.static(path.join(__dirname, 'specs')));
app.set('view engine', 'jade');
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});
app.configure('production', function(){
    app.use(express.errorHandler());
});

app.get('/foo', function (req, res) {
  res.json({
    firstName: 'John',
    lastName: 'Smith'
  });
});

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/src/db.js', function (req, res) {
	fs.readFile(__dirname + '/../src/db.js', function ( err , data ) {
		res.type( 'application/javascript' );
		res.send( 200 , data );
	});
});

app.listen(process.env.PORT || 3000);