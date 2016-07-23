var express = require('express');
var app = express();
var fetch = require('fetch');
var bodyParser = require('body-parser');
var fs = require('fs');
var creds;// = JSON.parse(require('./client_secret.json'));
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var sheets = google.sheets('v4');
var request = require('request'); 
var row = 0;

var authorization;  // Holds OAuth2 client credentials 
var spreadsheetID;  // Unique identifier of spreadsheet to be used
var writeable = false;

process.env.TZ = 'America/New_York';

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

app.post('/authorize', function(req, res) {
   authorize(function(){
     console.log(authorization);
   });
   res.send("Authorizing...");
});

app.post('/url', function(req, res) {
  var valid = parseInputID(req.body.url);
  if (valid) res.send('valid');
  else res.send('invalid');
});

app.get('/writeable', function(req, res) {
  isWriteable()
  .then(status => res.send('success'))
  .catch(err => res.send('fail'));
  //res.send(''); // TODO: fix this shit. It takes 2 submissions to work...
});

app.post('/swipe', function(req, res) {
  //swipeIn(req.body.netid);
  update("whatever", "whatever");
  res.send(''); // TODO: fix this shit. It takes 2 submissions to work...
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json';

/**
 *    METHODS
 */

function parseInputID(url) {
  var head = /spreadsheets\/d\//;
  var firstHalf = url.substring(url.search(head)).substring(15);
  var tail = firstHalf.indexOf('/');
  spreadsheetID = (tail === -1) ? firstHalf : firstHalf.substring(0, tail);
  if (spreadsheetID === '') return false;
  console.log("valid id: " + spreadsheetID);
  return true;
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(callback) {
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }

    creds = JSON.parse(content);
    var clientSecret = creds.installed.client_secret;
    var clientId = creds.installed.client_id;
    var redirectUrl = creds.installed.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
      if (err) {
        getNewToken(oauth2Client, callback);
      } else {
        oauth2Client.credentials = JSON.parse(token);
        authorization = oauth2Client;
        console.log(authorization);
        callback();
      }
    });
  });  
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function readPromise(range) {
  return new Promise(function(resolve, reject) {
    sheets.spreadsheets.values.get({
      auth: authorization,
      spreadsheetId: spreadsheetID,
      range: range,
    }, function(err, response) {
        if (err) reject(err);
        else resolve(response.values);
    });
  });
}

/**
 * Read cell A1 async, values returned are passed into update and
 * written to cell A1. If successfull, we know spreadsheet writeable
 */
// function isWriteable(res) {
//   sheets.spreadsheets.values.get({
//       auth: authorization,
//       spreadsheetId: spreadsheetID,
//       range: 'A1',
//     }, function(err, response) {
//         if (err) {
//           console.log('Spreadsheet not readable: ' + err);
//           return;
//         }
//         else {
//           sheets.spreadsheets.values.update(getValueRange('A1', response.values), function(err, response) {
//             if (err) {
//               console.log('Spreadsheet not writeable: ' + err);
//               return;
//             }
//             else {
//               writeable = true;
//             }
//           });
//         }
//     });
// }
function isWriteable() {
  console.log('checking is writable');
  return new Promise(function(resolve, reject) {
      sheets.spreadsheets.values.get({
        auth: authorization,
        spreadsheetId: spreadsheetID,
        range: 'A1',
      }, function(err, response) {
          if (err) {
            console.log('Spreadsheet not readable: ' + err);
            reject('error');
          }
          else {
            sheets.spreadsheets.values.update(getValueRange('A1', response.values), function(err, response) {
              if (err) {
                console.log('Spreadsheet not writeable: ' + err);
                reject('error');
              }
              else {
                console.log('Spreadsheet Writable');
                resolve('success');
              }
            });
          }
      });
  });
}





function getRange(row) {
  var num = row.toString();
  return 'A' + num + ':E' + num;
}

// function update(range, array) {

//   //var update = new Promise(function(resolve, reject) {
//     sheets.spreadsheets.values.update(getValueRange('A10:E10', array), function(err, response) {
//       if (err) {
//         console.log('Spreadsheet not writeable: ' + err);
//         return;
//       }
//     });

//   // update.then(function() {
//   //   console.log("Wrote successfully (update)");
//   // }).catch(function(err){
//   //   console.log('Cannot write to spreadsheet: (update)' + err);
//   // })

//   // console.log("THIS SHOULD COME FIRST");
// }

function update(range, array) {
  // row += 1;
  // sheets.spreadsheets.values.update(getValueRange(getRange(row), array), function(err, response) {
  //     if (err) {
  //       console.log('Cannot write to spreadsheet: ' + err);
  //     }
  //     console.log("Wrote successfully");
  //   });


  sheets.spreadsheets.batchUpdate({
    auth: authorization,
    spreadsheetId: spreadsheetID,
    
    resource: {
      requests: [
      {
        appendCells: {
          sheetId: 65864778, 
          "rows": [
          {
            "values": [{
                'formattedValue': "GAMOTO SPITI MOU", 
                userEnteredValue: {
                  stringValue: "DE GAMIESE"
                }
            }],
          }],
          "fields": "*"
        }
      }],
    }
  }, function(err, response) {
        if (err) {
          console.log('NO' + err);
        }
        else {
          console.log("YES");
          console.log(response);
        }
      });
}

/**
 * Print the names and majors of students in a sample spreadsheet:
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
//  */
// function listMajors() {
//   console.log(spreadsheetID);
//   sheets.spreadsheets.values.get({
//     auth: authorization,
//     spreadsheetId: spreadsheetID,
//     range: 'A1:E1',
//   }, function(err, response) {
//     if (err) {
//       console.log('The API returned an error: ' + err);
//       return;
//     }
//     var rows = response.values;
//     console.log(rows[0][0]);
//     // if (rows.length == 0) {
//     //   console.log('No data found.');
//     // } else {
//     //   console.log('Name, Major:');
//     //   for (var i = 0; i < rows.length; i++) {
//     //     var row = rows[i];
//     //     // Print columns A and E, which correspond to indices 0 and 4.
//     //     console.log('%s, %s', row[0], row[4]);
//     //   }
//     // }
//   });
// }

/**
 * Creates the body of the update request
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function getValueRange(range, array) {
  //console.log(array);
  return {
    auth: authorization,
    spreadsheetId: spreadsheetID,
    range: range,
    valueInputOption: 'USER_ENTERED',
    resource: { 
      values: array, 
      major_dimension: 'ROWS'
    }
  };
}

function makeArray(netid, timestamp, firstName, lastName, email) {
  return [[netid, timestamp, firstName, lastName, email]];
}

// function test() {
//   var host = 'https://gw-tst.its.yale.edu/soa-gateway/cs50?netid=sr692&type=json';

//   fetch(host, {
//     method: 'GET', 
//     // headers: {
//     //   "Content-Type": "application/json"
//     // }, 
//     // body: JSON.stringify(body)
//   }).then(function(res) {
//     return res.text();
//   }).then(function(res) {
//     console.log(res);
//   }).catch(function(err) {
//     console.log('Failed to validate ID.');
//   });
// }

function swipeIn(netid) {
  request.post(
    {
      url : 'https://gw-tst.its.yale.edu/soa-gateway/cs50?netid=' + netid + '&type=json'
    },
    function (error, response, body) {
      if(error) {
        console.log(error);
      }
      try {
        var result = JSON.parse(body);
      } catch(err) {
          console.log("Unable to find student");
        return;
      }
      update('A11:E11', makeArray(netid, 
              Date(),
              result["ServiceResponse"]["Record"]["FirstName"], 
              result["ServiceResponse"]["Record"]["LastName"],
              result["ServiceResponse"]["Record"]["EmailAddress"]
            ));
    }
  );
}

// function read(range) {
//   sheets.spreadsheets.values.get({
//     auth: authorization,
//     spreadsheetId: spreadsheetID,
//     range: range,
//   }, function(err, response) {
//     if (err) {
//       console.log('Cannot read from spreadsheet: (read)' + err);
//       return;
//     }
//     console.log("Read successfully (read)");

//     return response.values;
//     //console.log(rows);
//     // if (rows.length == 0) {
//     //   console.log('No data found.');
//     // } else {
//     //   console.log('Name, Major:');
//     //   for (var i = 0; i < rows.length; i++) {
//     //     var row = rows[i];
//     //     // Print columns A and E, which correspond to indices 0 and 4.
//     //     console.log('%s, %s', row[0], row[4]);
//     //   }
//     // }
//   });
// }

/**
 *   PROGRAM
 */

//initialize();

module.exports = {
  parseInputID
}