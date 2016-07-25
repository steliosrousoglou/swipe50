const express = require('express');
const request = require('request');
const app = express();
const bodyParser = require('body-parser');
const creds = require('./client_secret.json');
const token = require('./token.json');
const google = require('googleapis');
const GoogleAuth = require('google-auth-library');
const sheets = google.sheets('v4');

process.env.TZ = 'America/New_York';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true,
}));

const clientSecret = creds.installed.client_secret;
const clientId = creds.installed.client_id;
const redirectUrl = creds.installed.redirect_uris[0];
const auth = new GoogleAuth();
const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

oauth2Client.credentials = token;
const authorization = oauth2Client;

const getValueRange = (range, array, spreadsheetId) => ({
  auth: authorization,
  spreadsheetId,
  range,
  valueInputOption: 'USER_ENTERED',
  resource: {
    values: array,
    major_dimension: 'ROWS',
  },
});

const ensureHeaders = (spreadsheetId, sheetTitle) => {
  sheets.spreadsheets.values.update(getValueRange(
    `${sheetTitle}!A1:E1`,
    [['netID', 'Timestamp', 'First Name', 'Last Name', 'email']],
    spreadsheetId
    ), () => {});
};

const isWriteable = (spreadsheetId, sheetId) => new Promise((resolve, reject) => {
  // Make attempt to write to sheet
  sheets.spreadsheets.batchUpdate({
    auth: authorization,
    spreadsheetId,
    resource: {
      requests: [{
        updateCells: {
          rows: [{
            values: [{
              userEnteredValue: {
                stringValue: ' ',
              },
            }],
          }],
          fields: '*',
          start: {
            sheetId,
            rowIndex: 0,
            columnIndex: 25,
          },
        },
      }],
    },
  }, (err, res) => {
    if (err) reject();
    resolve(res);
  });
});

const studentRow = (netid, firstName, lastName, email) => [
  { userEnteredValue: { stringValue: netid } },
  { userEnteredValue: { stringValue: Date() } },
  { userEnteredValue: { stringValue: firstName } },
  { userEnteredValue: { stringValue: lastName } },
  { userEnteredValue: { stringValue: email } },
];

const getStudent = (netid) => new Promise((resolve, reject) => {
  request.post({
    url: `https://gw-tst.its.yale.edu/soa-gateway/cs50?netid=${netid}&type=json`,
  }, (error, response, body) => {
    if (error) reject();
    // Format the object returned from school
    let student;
    try {
      console.log("HELLO");
      student = JSON.parse(body);
    } catch (err) { console.log("HERE");console.log(err); reject();}

    const values = studentRow(netid,
      student.ServiceResponse.Record.FirstName,
      student.ServiceResponse.Record.LastName,
      student.ServiceResponse.Record.EmailAddress
    );
    resolve(values);
  });
});

const getSpreadsheet = (spreadsheetId) => new Promise((resolve, reject) => {
  sheets.spreadsheets.get({
    auth: authorization,
    spreadsheetId,
  }, (err, res) => {
    if (err) reject('error');
    res.sheets.forEach(x => ensureHeaders(spreadsheetId, x.properties.title));
    resolve(res);
  });
});

const getSpreadsheetData = (spreadsheetId, sheetName) => new Promise((resolve, reject) => {
  sheets.spreadsheets.values.get({
    auth: authorization,
    spreadsheetId,
    range: sheetName,
  }, (err, res) => {
    if (err) {
      reject(err);
    }
    resolve(res);
  });
});

app.post('/writeable', (req, res) => {
  isWriteable(req.body.spreadsheetId, req.body.sheetId)
  .then(body => res.send(body))
  .catch(() => res.send('fail'));
});

app.post('/spreadsheet', (req, res) => {
  getSpreadsheet(req.body.spreadsheetId)
  .then(body => res.send(body))
  .catch(() => res.send('fail'));
});

app.post('/swipe', (req, res) => {
  getStudent(req.body.netid)
  .then(values => {
    // Append the values to the sheet
    sheets.spreadsheets.batchUpdate({
      auth: authorization,
      spreadsheetId: req.body.spreadsheetId,
      resource: {
        requests: [{
          appendCells: {
            sheetId: req.body.sheetId,
            rows: [{ values }],
            fields: '*',
          },
        }],
      },
    }, (err) => {
      if (err) res.send('fail');
      else res.send(values);
    });
  }).catch(() => res.send('fail'));
});

app.post('/export', (req, res) => {
  getSpreadsheetData(req.body.spreadsheetId, req.body.sheetName)
  .then(body => res.send(body))
  .catch((err) => res.send(err));
});

app.listen(3000);
