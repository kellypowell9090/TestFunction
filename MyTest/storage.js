
const storage = require('azure-storage');

// if (process.env.NODE_ENV !== 'production') {
//   require('dotenv').load();
// }
 
const accessKey = "bpKQAs2pVQqG2Nq9kY+TCZlJhSMTFAABo7U54mFOQLVSWzPcoHjAtbQRDxYbIuoY1Nk2v23pCyDMg7UhSqFLvg==";
const storageAccount = 'phoenixstatements';
const container = 'hockey';
const blobName = 'qb.log';
var blobService ;

//TO DO: await in main file doesnt work
exports.configureBlobLogging = async function ()
{
    blobService = storage.createBlobService(storageAccount, accessKey);
    blobService.doesBlobExist(container, blobName,
        function(error, errorOrResult){
            if(error){
                console.log("Couldn't check if blob exists: " + blobName + ", Error: " + error);
            } else {
                console.log("Blob exists. result: " + errorOrResult.exists );
                if(!errorOrResult.exists)
                {
                    console.log("Blob doesnt exist. Creating now...");
                    blobService.createAppendBlobFromText(container, blobName, '', function(error, result, response){
                        if(error){
                          console.log("Error creating blob: " + blobName);
                          return false;
                        }
                        else
                        {
                            console.log("Successfully created blob: " + blobName);
                            return true;
                        }
                      });
                }
            }
        });
}

exports.logToBlob =  function (text)
{
    var datetime = new Date();
    var mydate = new Date(Date.now()).toLocaleString();
    blobService.appendBlockFromText( container, blobName, mydate + " - Version " + text + '\r\n',
    function(error, result, response){
        if(error){
            console.log("Couldn't upload to blob file: " + blobName + ", Error: " + error);
        } else {
            //console.log("Successfully uploaded to blob file: " + blobName );
        }
    });
}

exports.listBlobs = function()
{
    blobService.listContainersSegmented(null, function(err, result) {
        if (err) {
            console.log("Couldn't list containers. Error: ");
            console.error(err);
        } else {
            console.log('Successfully listed containers: ');
            result.entries.forEach(function (entry) {
                console.log( "Found an entry: " + entry.name)
            });
        }
    });
}
