var Vault = require('./vault.js');
var http = require('http');
var port = process.env.PORT || 3000;
var request = require('request');
var qs = require('querystring');
var util = require('util');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var express = require('express');
//var app = express();
var QuickBooks = require('../index');
var Tokens = require('csrf');
var miscFunctions = require("./miscFunctions.js");
var csrf = new Tokens();
const fs = require('fs');
const path = require('path');

var BlobStorage = require('./storage.js');

const createHandler = require('azure-function-express').createHandler;
const app = require('express')();

var sessionSet = false;
var reloadHtml = "";
const version = "2.2";


// Generic Express config
console.log('About to set generic express config...');
app.set('port', port);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser('brad'));
app.use(session({ resave: false, saveUninitialized: false, secret: 'smith' }));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views',  __dirname + '\\views');
app.set('routes', './routes');

BlobStorage.configureBlobLogging().then(function() {
  //BlobStorage.logToBlob(version + " - Blob logging has been configured");
});

app.listen(app.get('port'), function () {
  //BlobStorage.logToBlob(version + " - Express server listening on port " + app.get('port')  + ". RedirectUri " + redirectUri);
});

// development
var consumerKey = 'Q0hWFVoQP0AlilQGDbZDlqj9lZKqbf7R7S8IS8LTfOKrZTLTzb';
var consumerSecret = 'LG8hWygP46wQKlAccWKDRjPohdif2TOTMBEXQZGh';
var redirectUri = 'http://localhost:' + port ;
var useSandbox = true;
var grantUrl = redirectUri + '/requestToken/';

//production
// var consumerKey = 'Q0nZqGF1fU7gd7am7k5z5zzu2ueKGvDCcG1GIlcHyU6FMJb1Rq';
// var consumerSecret = 'hyb3j6KzGfjd5L6aqi5SYa1Q0ZDHLF4YGZznqaeZ';
// var redirectUri = "https://esd-qb-kp.azurewebsites.net";
// var useSandbox = false;
// var grantUrl = 'https://esd-qb-kp.azurewebsites.net/requestToken';

//Simple route which redirects / to /qb
app.get('/', function (req, res) {
  res.redirect('/qb');
})

app.get("/logout", (req, res) => {
  BlobStorage.logToBlob(version + " - The logout page was loaded.");
    res.send("Thank you for using our app.");
});

app.get("/login", (req, res) => {
    BlobStorage.logToBlob(version + " - The login page was loaded");
    res.send("Welcome to the login page");
});

app.get("/results", (req, res) => {
    BlobStorage.logToBlob(version + " - The results page was loaded");
    BlobStorage.logToBlob(version + " - The reload html is: " + reloadHtml);
 
    res.send("These are the results from QuickBooks:<br> " + reloadHtml );
});

//This route is the start of the application, it checks to see if there is a session, 
//if no session set, it will render the login page
app.get("/qb", (req, res) => {
    //access on azure at: https://esd-qb-kp.azurewebsites.net/qb
    BlobStorage.logToBlob(version + " - The qb connect page was loaded. sessionSet: " + sessionSet);

    if (sessionSet) {
      //If a session is set, this identifies that the user has logged in and renders home.ejs view
      res.render('home.ejs');
    } else {
      //If no session has been set, will render the start page to initiate login
      res.render('intuit.ejs', { locals: { port: port, appCenter: QuickBooks.APP_CENTER_BASE, grantUrl: grantUrl } })
    }
});

app.get("/realmtest", (req, res) => {
   //access locally at: http://localhost:3000/realmtest?name=Kelly
  let realmSecretName = "RealmID" + req.query.name; 
  let realmID = "123146147249104";
  let result =  Vault.SetVaultSecret( realmSecretName, realmID).then(function(value) {
    console.log(value);
    res.send("SetVaultSecret returned: " + value)
  });

});

app.get("/vault", (req, res) =>  {
  //access this locally at: http://localhost:3000/vault?name=kel
  //access on azure at: https://esd-qb-kp.azurewebsites.net/vault?name=kel
  let result =  Vault.TestVault(req).then(function(value) {
      res.send("Vault test returned: " + value)
    });

});

//This route will take the Request Token and Initiate the User Authentication
app.get('/requestToken', function (req, res) {
    BlobStorage.logToBlob(version + " - In app.get request token. Getting authorisation");
    var redirecturl = 'https://appcenter.intuit.com/connect/oauth2' +
    '?client_id=' + consumerKey +
    '&redirect_uri=' + encodeURIComponent(redirectUri + '/callback/') +  //Make sure this path matches entry in application dashboard
    '&scope=com.intuit.quickbooks.accounting' +
    '&response_type=code' +
    '&state=' + generateAntiForgery(req.session);
    BlobStorage.logToBlob(version + " - In requestToken the redirectUrl is: " + redirecturl);
    res.redirect(redirecturl);
});

//Access Token request followed by the Access Token response
app.get('/callback', function (req, res) {
    BlobStorage.logToBlob(version + " - In callback. Exchange code for refresh and access token");
    var auth = (new Buffer(consumerKey + ':' + consumerSecret).toString('base64'));

    var postBody = {
        url: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + auth,
    },
    form: {
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: redirectUri + '/callback/'  //Make sure this path matches entry in application dashboard
    }
  };

  request.post(postBody, function (e, r, data) {
    var accessToken = JSON.parse(r.body);
   // save the access token somewhere on behalf of the logged in user
    //The Access Token is stored in req.session.qbo
    req.session.qbo = {
      accesstToken: accessToken.access_token,
      refreshToken: accessToken.refresh_token,
      companyid: req.query.realmId,
      consumerkey: consumerKey,
      consumersecret: consumerSecret,
      useSandbox: useSandbox,
    };
 
    reloadHtml = "<body>";
 
    var qbo = miscFunctions.getQbo(QuickBooks, req.session.qbo);
    sessionSet = true;

    //Include the routes.js file, the qbo object is passed into the this file
    var router = require('./routes/routes.js')(app, qbo, version);

    reloadHtml += "<b>Refresh Token:</b> " + accessToken.refresh_token  + "<br>";
    reloadHtml += "<b>Realm ID:</b> " + req.query.realmId  + "<br>";

    BlobStorage.logToBlob(version + " - the realmID is:" + req.query.realmId);
    BlobStorage.logToBlob(version + " - the access_token is:" + accessToken.access_token);
    BlobStorage.logToBlob(version + " - the access token expires in:" + accessToken.expires_in);
    BlobStorage.logToBlob(version + " - the refresh_token is:" + accessToken.refresh_token);
    BlobStorage.logToBlob(version + " - the refresh token expires in:" + accessToken.x_refresh_token_expires_in);

    res.send('<!DOCTYPE html><html lang="en"><head></head><body><script>window.opener.location.reload(); window.close();</script></body></html>');

  });
});

module.exports = createHandler(app);

 // OAUTH 2 makes use of redirect requests
function generateAntiForgery (session) {
  session.secret = csrf.secretSync();
  return csrf.create(session.secret);
};
 