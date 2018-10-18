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
var csrf = new Tokens();
const fs = require('fs');
const path = require('path');
 
const createHandler = require('azure-function-express').createHandler;
const app = require('express')();

var reloadHtml = "";
var resultsUrl = "";

// Generic Express config
console.log('About to set generic express config...');
app.set('port', port);
app.set('views', 'views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser('brad'));
app.use(session({ resave: false, saveUninitialized: false, secret: 'smith' }));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname);

app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

// development
// var consumerKey = 'Q0hWFVoQP0AlilQGDbZDlqj9lZKqbf7R7S8IS8LTfOKrZTLTzb';
// var consumerSecret = 'LG8hWygP46wQKlAccWKDRjPohdif2TOTMBEXQZGh';
// var redirectUri = 'http://localhost:' + port ;


//production
var consumerKey = 'Q0nZqGF1fU7gd7am7k5z5zzu2ueKGvDCcG1GIlcHyU6FMJb1Rq';
var consumerSecret = 'hyb3j6KzGfjd5L6aqi5SYa1Q0ZDHLF4YGZznqaeZ';
var redirectUri = "https://esd-qb-kp.azurewebsites.net";

app.get("/logout", (req, res) => {
    res.send("Thank you for using our app.");
});

app.get("/login", (req, res) => {
    res.send("Welcome to the login page");
});

app.get("/results", (req, res) => {
    res.send("These are the results from QuickBooks:<br> " + reloadHtml);
});

app.get("/qb", (req, res) => {
    res.render('intuit.ejs', { port: port, appCenter: QuickBooks.APP_CENTER_BASE });
});

app.get("/vault", (req, res) =>  {
  //access this locally at: http://localhost:3000/vault?name=kel
  //access on azure at: https://esd-qb-kp.azurewebsites.net/vault?name=kel
  let result =  Vault.testVault(req.context, req).then(function(value) {
      res.send("Vault test returned: " + value)
    });

});

app.get('/requestToken', function (req, res) {
    console.log('In app.get request token');
    var redirecturl = 'https://appcenter.intuit.com/connect/oauth2' +
    '?client_id=' + consumerKey +
    '&redirect_uri=' + encodeURIComponent(redirectUri + '/callback/') +  //Make sure this path matches entry in application dashboard
    '&scope=com.intuit.quickbooks.accounting' +
    '&response_type=code' +
    '&state=' + generateAntiForgery(req.session);
    console.log(redirecturl);
    res.redirect(redirecturl);
});


app.get('/callback', function (req, res) {
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

    reloadHtml = "<body>";
    var qbo = new QuickBooks(consumerKey,
      consumerSecret,
      accessToken.access_token, /* oAuth access token */
      false, /* no token secret for oAuth 2.0 */
      req.query.realmId,
      true, /* use a sandbox account */
      true, /* turn debugging on */
      4, /* minor version */
      '2.0', /* oauth version */
     accessToken.refresh_token /* refresh token */);

     reloadHtml += "<b>Consumer Key:</b> " + consumerKey + "<br>";
     reloadHtml += "<b>Consumer Secret:</b> " + consumerKey  + "<br>";
     reloadHtml += "<b>Access Token:</b> " + accessToken.access_token  + "<br>";
     
    //  console.log(consumerSecret);
    //  console.log(accessToken.access_token);
    //  console.log(req.query.realmId);
    //  console.log(accessToken.refresh_token);
   
    var i = 0;
    qbo.findAccounts(function (_, accounts) {
      accounts.QueryResponse.Account.forEach(function (account) {
      i++ ;
      });
    });
   console.log('Number of Accounts: ' + i);
    reloadHtml += "<b>Number of Accounts:</b> " + i  + "<br></body>";
 
  });

  resultsUrl = "'https://esd-qb-kp.azurewebsites.net/results'";
  var newHtml = '<!DOCTYPE html><html lang="en"><head></head><body><script>alert("hello4");window.opener.location="/results";window.close();</script></body></html>';

  res.send(newHtml);
});

module.exports = createHandler(app);

 // OAUTH 2 makes use of redirect requests
function generateAntiForgery (session) {
  session.secret = csrf.secretSync();
  return csrf.create(session.secret);
};
 