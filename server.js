"use strict";

var express = require("express");
var favicon = require("serve-favicon");
var bodyParser = require("body-parser");
var session = require("express-session");
var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var consolidate = require("consolidate"); // Templating library adapter for Express
var swig = require("swig");
var helmet = require("helmet");

var MongoClient = require("mongodb").MongoClient; // Driver for connecting to MongoDB
var http = require("http");
var marked = require("marked");
//var nosniff = require('dont-sniff-mimetype');
var app = express(); // Web framework to handle routing requests
var routes = require("./app/routes");
var config = require("./config/config"); // Application config properties
//A2-2 Broken Auth
app.use(cookieParser());


// A6-Sensitive Data Exposure
var fs = require("fs");
var https = require("https");
var path = require("path");
var httpsOptions = {
    key: fs.readFileSync(path.resolve(__dirname, "./artifacts/cert/server.key")),
    cert: fs.readFileSync(path.resolve(__dirname, "./artifacts/cert/server.crt"))
};


MongoClient.connect(config.db, function(err, db) {
    if (err) {
        console.log("Error: DB: connect");
        console.log(err);

        process.exit(1);
    }
    console.log("Connected to the database: " + config.db);


    // A5 - Security MisConfig
    app.disable("x-powered-by");

    app.use(helmet.frameguard());

    app.use(helmet.noCache());

    app.use(helmet.contentSecurityPolicy);

    app.use(helmet.hsts());

    // TODO: Add another vuln: https://github.com/helmetjs/helmet/issues/26
    // Enable XSS filter in IE (On by default)
    // app.use(helmet.iexss());
    // Now it should be used in hit way, but the README alerts that could be
    // dangerous, like specified in the issue.
    // app.use(helmet.xssFilter({ setOnOldIE: true }));

    // Forces browser to only use the Content-Type set in the response header instead of sniffing or guessing it
    app.use(helmet.noSniff());


    // Adding/ remove HTTP Headers for security
    app.use(favicon(__dirname + "/app/assets/favicon.ico"));

    // Express middleware to populate "req.body" so we can access POST variables
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        // Mandatory in Express v4
        extended: false
    }));

    // A3 - XSS
    app.set('trust proxy', 1);// trust first proxy
    app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true,
        cookie: {
            httpOnly: true,
            secure: true
        }
    }));


    // A8 - CSRF
    app.use(csrf());
    app.use(function(req, res, next) {
        res.locals.csrftoken = req.csrfToken();
        next();
    });


    // Register templating engine
    app.engine(".html", consolidate.swig);
    app.set("view engine", "html");
    app.set("views", __dirname + "/app/views");
    app.use(express.static(__dirname + "/app/assets"));


    // Initializing marked library
    // Fix for A9 - Insecure Dependencies
    marked.setOptions({
        sanitize: true
    });
    app.locals.marked = marked;

    // Application routes
    routes(app, db);

    // Template system setup
    swig.setDefaults({

        // A3 - XSS
        autoescape: true // default value

    });


    // A6-Sensitive Data Exposure
    https.createServer(httpsOptions, app).listen(config.port,  function() {
        console.log("Express https server listening on port " + config.port);
    });

});
