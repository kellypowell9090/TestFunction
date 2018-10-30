module.exports = function (app, qbo, version) {
    var Vault = require('../vault.js');

    //a route for testing
    app.get("/testing", (req, res) => {
    //access on azure at: https://esd-qb-kp.azurewebsites.net/testing
    //or locally at: http://localhost:3000/testing?name=Kelly
    
    //BlobStorage.logToBlob(version + " - The testing page was loaded");
    console.log("In the testing route");
    var accesstoken = "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..fQT_Myo6PNuiE7KRkX5FlA.DcwWY6Kx76DX3gUyUZvV4lrQH0TEH3HBW-rV19E1XRhqO8PYCRaUU9wJI4wqlAAcPZ-erh5XQIqK29D8PbKuMZ82v5_mYrLVyZtifzwpzhesJ9afe3WtfOC-dAvBQSjNLR-ytg19imIUCRBOcNzg3DSMx5hAHjS5gmGjLnY72nO1SfT622nsoEbOQ3ScxWsxsuWzqWjvbIggecpy3fAN_OT0aZXGduepXQ6bXcSjCRQhA-arTL_scjL3lb4WqfYPZMar5b7YVlWT23mncVmo-4z2xrj9fSbFbJAB5NVldFFrwVwECUbNrr_qpNRnhdmTW_BLoebrCkrfUYQcMs6WXGfA9DS6ikExqJIye9enZywkWOKrGdh_7sAUmHa5yvMTZXgmldy_GNISCnsIw23WYZyeLAvMgXgTulNNh-C3GwrXEJbaRkygMlYtjU-m3Fk5OPIrtBpPBC5xcbw5jjw-2avNcP1oFteOLlIa6a-mosL0QwSfy_qhrXuBLNPYfa_jZnLChHu_i321pag1Aa8ilezZlRyG-aEsLWvjS3TDYZjEUP6B9IxEZf9CxPt-15Kx88NCBei2kMYdGrYDRckUZTvfLHTfmCFj1ndZHhV-d5FhavUAEjextKY3QuY3X4uyDig67AXRC1DUeOq7PW3wNGW0G-eGhc605P15ILDOF-bfOU8lEjRsisyNA8KLnKzV.KYOV7eZDrlGJc37iSeY_YA";
    var refreshtoken = "Q0115495099370LtXk6RIkHAnmovqKgLQS6EIWcr7BNA55ixwM";
    var realmId = ""; //"123146147249104";
    var i = 0;
    var html = "<body><b>Version: " + version + "</b> - The following accounts exist: " + "<br><br>";
  
    let realmSecretName = "RealmID" + req.query.name;
    Vault.GetVaultSecret(realmSecretName).then(function(realmId) {
    console.log("GetVaultSecret returned: " + realmId);
  
  
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

    //a route which lists the accounts
    app.get('/listAccountsForm', function (req, res) {
        //Retrieve all accounts to populate the createItemForm
        qbo.findAccounts(function (_, accounts) {
            res.render('listAccountsForm.ejs', { locals: { accounts: accounts.QueryResponse.Account } })
        })
    })


    //a disconnect route to log out

}