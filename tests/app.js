/*global require, module, __dirname, process*/
'use strict';
var express = require('express');
var app = module.exports = express();
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');

app.set('views', path.join(__dirname, 'views'));
app.use('/bower', express.static(path.join(__dirname, '../bower')));
app.use('/specs', express.static(path.join(__dirname, 'specs')));
app.set('view engine', 'jade');
app.use('/foo', bodyParser.json());
app.use('/', bodyParser.text({type: 'text/html'}));

var env = process.env.NODE_ENV || 'development';
if (env === 'development') {
    app.use(errorHandler({dumpExceptions: true, showStack: true}));
}

app.get('/foo', function (req, res) {
    res.json({
        firstName: 'John',
        lastName: 'Smith'
    });
});

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/dist/db.js', function (req, res) {
    fs.readFile(__dirname + '/../dist/db.js', function (err, data) {
        if (err) {
            console.error(err);
            return;
        }
        res.type('application/javascript');
        res.status(200).send(data);
    });
});

app.listen(process.env.PORT || 3000);
