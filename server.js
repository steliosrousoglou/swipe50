const express = require('express');
const request = require('request');
const app = express();
const bodyParser = require('body-parser');
const creds = require('./client_secret.json');
const token = require('./token.json');
const google = require('googleapis');
const GoogleAuth = require('google-auth-library');
const sheets = google.sheets('v4');
const fs = require('fs');

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

/*
 * Returns ValueRange object required by spreadsheets.values.update
 */
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

/*
 * Writes headers to the first row of the specified sheet
 */
const ensureHeaders = (spreadsheetId, sheetTitle) => {
  sheets.spreadsheets.values.update(getValueRange(
    `${sheetTitle}!A1:E1`,
    [['netID', 'Timestamp', 'First Name', 'Last Name', 'email']],
    spreadsheetId
    ), () => {});
};

/*
 * Attempt to write to cell 0, 25 of specified sheet. Determines
 * whether sheet is writeable, resolves/rejects accordingly.
 */
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

/*
 * Returns new entry's info formatted as a row
 */
const studentRow = (netid, firstName, lastName, email) => [
  { userEnteredValue: { stringValue: netid } },
  { userEnteredValue: { stringValue: Date() } },
  { userEnteredValue: { stringValue: firstName } },
  { userEnteredValue: { stringValue: lastName } },
  { userEnteredValue: { stringValue: email } },
];

/*
 * Makes post request to Yale API and fetches student info
 */
const getStudent = netid => new Promise((resolve, reject) => {
  request.post({
    url: `https://gw-tst.its.yale.edu/soa-gateway/cs50?netid=${netid}&type=json`,
  }, (error, response, body) => {
    if (error) reject();
    // Format the object returned from school
    let student;
    try {
      student = JSON.parse(body);
    } catch (err) {
      reject();
      return;
    }

    const values = studentRow(netid,
      student.ServiceResponse.Record.FirstName,
      student.ServiceResponse.Record.LastName,
      student.ServiceResponse.Record.EmailAddress
    );
    resolve(values);
  });
});

/*
 * Fetches information about the spreadsheet and initializes
 * the first row of every sheet to the standard headers
 */
const getSpreadsheet = spreadsheetId => new Promise((resolve, reject) => {
  sheets.spreadsheets.get({
    auth: authorization,
    spreadsheetId,
  }, (err, res) => {
    if (err) reject('error');
    res.sheets.forEach(x => ensureHeaders(spreadsheetId, x.properties.title));
    resolve(res);
  });
});

/*
 * Fetches all cell data from specified sheet
 */
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

/*
 * Endpoint to determine if specified sheet is writeable, responds
 * with keyword 'fail' if it is not.
 */
app.post('/writeable', (req, res) => {
  isWriteable(req.body.spreadsheetId, req.body.sheetId)
  .then(body => res.send(body))
  .catch(() => res.send('fail'));
});

/*
 * Endpoint to respond with spreadsheet information such as
 * title of spreadsheet and array of available sheets, responds
 * with keyword 'fail' to notify front end
 */
app.post('/spreadsheet', (req, res) => {
  getSpreadsheet(req.body.spreadsheetId)
  .then(body => res.send(body))
  .catch(() => res.send('fail'));
});

/*
 * Endpoint to add a row to specified sheet, or respond
 * with keyword 'fail' to notify front end
 */
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
      else {
        // if (values[4].userEnteredValue.stringValue === 'stylianos.rousoglou@yale.edu') {
        //   // SEND EMAIL
        // }
        res.send(values);
      }
    });
  }).catch(() => res.send('fail'));
});

const processData = data => {
  // remove headers from data
  data.values.shift();
  const students = data.values;
  // require staff netids file
  const staffFile = fs.readFileSync('./staff.txt', 'utf8');
  // staff netids in array 'staff', remove empty lines
  const staff = staffFile.split('\n').filter(s => s !== '');
  // to hold students and staff
  const studentsAttending = [];
  const staffAttending = [];
  // regex to match time
  const getTime = /..:..:../;
  const separator = '\n------------------------------------------\n';

  let response = '';

  // const netids = students.map(x => x[0]);
  students.forEach(id => {
    const time = id[1].match(getTime);
    const checkIn = time[0];
    if (staff.indexOf(id[0]) !== -1) staffAttending.push([id[0], checkIn, id[2], id[3]]);
    else studentsAttending.push([id[0], checkIn, id[2], id[3]]);
  });

  // store all late staff
  const lateStaff = staffAttending.filter(s => s[1] > '14:00:00');
  const ontimeStaff = staffAttending.filter(s => s[1] <= '14:00:00');
  response = response.concat(separator);
  response = response.concat('\nSTAFF INFO\n');
  response = response.concat(`# staff: ${staffAttending.length}\n`);
  response = response.concat(`# late: ${lateStaff.length}\n`);
  response = response.concat(`# on-time: ${ontimeStaff.length} \n`);
  response = response.concat('\nLate: \n');
  lateStaff.forEach(x => {
    response = response.concat(`${x[2]} ${x[3]}\n`);
  });
  response = response.concat('\nOn Time: \n');
  ontimeStaff.forEach(x => {
    response = response.concat(`${x[2]} ${x[3]}\n`);
  });
  response = response.concat(separator);
  response = response.concat('\nSTUDENT INFO\n\n');
  response = response.concat(`# students: ${studentsAttending.length}\n`);
  studentsAttending.forEach(x => {
    response = response.concat(`${x[2]} ${x[3]}\n`);
  });
  response = response.concat(separator);

  console.log(response);

  // everyone's emails
  const emails = students.map(x => x[4]);

  return response;
};

/*
 * Endpoint to send all cell data available on specified sheet
 * for purposes of analyzing attendance
 * TODO: post request should ONLY happen if logged in with heads credentials
 */
app.post('/export', (req, res) => {
  getSpreadsheetData(req.body.spreadsheetId, req.body.sheetName)
  .then(body => processData(body))
  .then((data) => res.send(data))
  .catch((err) => res.send(err));
});

app.listen(3000);
