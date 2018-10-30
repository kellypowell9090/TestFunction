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

var BlobStorage = require('./storage.js');

const createHandler = require('azure-function-express').createHandler;
const app = require('express')();

var sessionSet = false;
var reloadHtml = "";
const version = "2.2";
const OAUTH_MINOR_VERSION = 4;
const OAUTH_MAJOR_VERSION = '2.0';
const QBO_DEBUG = true;

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

BlobStorage.configureBlobLogging().then(function() {
  //BlobStorage.logToBlob(version + " - Blob logging has been configured");
});

app.listen(app.get('port'), function () {
  //BlobStorage.logToBlob(version + " - Express server listening on port " + app.get('port')  + ". RedirectUri " + redirectUri);
});

// development
// var consumerKey = 'Q0hWFVoQP0AlilQGDbZDlqj9lZKqbf7R7S8IS8LTfOKrZTLTzb';
// var consumerSecret = 'LG8hWygP46wQKlAccWKDRjPohdif2TOTMBEXQZGh';
// var redirectUri = 'http://localhost:' + port ;
// var useSandbox = true;

//production
var consumerKey = 'Q0nZqGF1fU7gd7am7k5z5zzu2ueKGvDCcG1GIlcHyU6FMJb1Rq';
var consumerSecret = 'hyb3j6KzGfjd5L6aqi5SYa1Q0ZDHLF4YGZznqaeZ';
var redirectUri = "https://esd-qb-kp.azurewebsites.net";
var useSandbox = false;

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
      res.render('intuit.ejs', { locals: { port: port, appCenter: QuickBooks.APP_CENTER_BASE } })
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

app.get("/testing", (req, res) => {
  //access on azure at: https://esd-qb-kp.azurewebsites.net/testing
  //or locally at: http://localhost:3000/testing?name=Kelly
  
  //BlobStorage.logToBlob(version + " - The testing page was loaded");
  
  var accesstoken = "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..fQT_Myo6PNuiE7KRkX5FlA.DcwWY6Kx76DX3gUyUZvV4lrQH0TEH3HBW-rV19E1XRhqO8PYCRaUU9wJI4wqlAAcPZ-erh5XQIqK29D8PbKuMZ82v5_mYrLVyZtifzwpzhesJ9afe3WtfOC-dAvBQSjNLR-ytg19imIUCRBOcNzg3DSMx5hAHjS5gmGjLnY72nO1SfT622nsoEbOQ3ScxWsxsuWzqWjvbIggecpy3fAN_OT0aZXGduepXQ6bXcSjCRQhA-arTL_scjL3lb4WqfYPZMar5b7YVlWT23mncVmo-4z2xrj9fSbFbJAB5NVldFFrwVwECUbNrr_qpNRnhdmTW_BLoebrCkrfUYQcMs6WXGfA9DS6ikExqJIye9enZywkWOKrGdh_7sAUmHa5yvMTZXgmldy_GNISCnsIw23WYZyeLAvMgXgTulNNh-C3GwrXEJbaRkygMlYtjU-m3Fk5OPIrtBpPBC5xcbw5jjw-2avNcP1oFteOLlIa6a-mosL0QwSfy_qhrXuBLNPYfa_jZnLChHu_i321pag1Aa8ilezZlRyG-aEsLWvjS3TDYZjEUP6B9IxEZf9CxPt-15Kx88NCBei2kMYdGrYDRckUZTvfLHTfmCFj1ndZHhV-d5FhavUAEjextKY3QuY3X4uyDig67AXRC1DUeOq7PW3wNGW0G-eGhc605P15ILDOF-bfOU8lEjRsisyNA8KLnKzV.KYOV7eZDrlGJc37iSeY_YA";
  var refreshtoken = "Q0115495099370LtXk6RIkHAnmovqKgLQS6EIWcr7BNA55ixwM";
  var realmId = ""; //"123146147249104";
  var i = 0;
  var html = "<body><b>Version: " + version + "</b> - The following accounts exist: " + "<br><br>";

  let realmSecretName = "RealmID" + req.query.name;
  Vault.GetVaultSecret(realmSecretName).then(function(realmId) {
  console.log("GetVaultSecret returned: " + realmId);

    var qbo = new QuickBooks(consumerKey,
      consumerSecret, accesstoken, false, /* no token secret for oAuth 2.0 */
      realmId, useSandbox, false, OAUTH_MINOR_VERSION, OAUTH_MAJOR_VERSION,  refreshtoken );


    qbo.findAccounts(function (err, accounts) {
      if(err)
      {
        console.log("An error occurred");
        res.render('errorpage.ejs', { errorMessage: err.fault.error[0] });
      }
      else
      {
        accounts.QueryResponse.Account.forEach(function (account) {
          html +=  account.Name + "<br>";
          i++ ;
        });
    
        html += "<br><b>Total Number of Accounts:</b> " + i  + "<br></body>";
        res.send(html);
      }
      });

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

    // BlobStorage.logToBlob(version + " - about to save access token in callback");
    //The Access Token is stored in req.session.qbo
    req.session.qbo = {
      token: accessToken.access_token,
      secret: "",
      companyid: req.query.realmId,
      consumerkey: consumerKey,
      consumersecret: consumerSecret
    };
 
    reloadHtml = "<body>";
    var qbo = new QuickBooks(consumerKey,
      consumerSecret, accessToken.access_token, false, /* no token secret for oAuth 2.0 */
      req.query.realmId,
      useSandbox,   QBO_DEBUG, 
      OAUTH_MINOR_VERSION, OAUTH_MAJOR_VERSION, accessToken.refresh_token );

      sessionSet = true;

    reloadHtml += "<b>Refresh Token:</b> " + accessToken.refresh_token  + "<br>";
    reloadHtml += "<b>Realm ID:</b> " + req.query.realmId  + "<br>";

    BlobStorage.logToBlob(version + " - the realmID is:" + req.query.realmId);
    BlobStorage.logToBlob(version + " - the access_token is:" + accessToken.access_token);
    BlobStorage.logToBlob(version + " - the access token expires in:" + accessToken.expires_in);
    BlobStorage.logToBlob(version + " - the refresh_token is:" + accessToken.refresh_token);
    BlobStorage.logToBlob(version + " - the refresh token expires in:" + accessToken.x_refresh_token_expires_in);

    var i = 0;
    qbo.findAccounts(function (_, accounts) {
      accounts.QueryResponse.Account.forEach(function (account) {
        //BlobStorage.logToBlob(version + " - Found an account: " + account)
        i++ ;
      });
      BlobStorage.logToBlob(version + " - At end of number of accounts: " + i);
      reloadHtml += "<b>Number of Accounts:</b> " + i  + "<br></body>";
      var newHtml = '<!DOCTYPE html><html lang="en"><head></head><body><script>window.opener.location="/results";window.close();</script></body></html>';
      res.send(newHtml);
    });

  });
});

module.exports = createHandler(app);

 // OAUTH 2 makes use of redirect requests
function generateAntiForgery (session) {
  session.secret = csrf.secretSync();
  return csrf.create(session.secret);
};
 