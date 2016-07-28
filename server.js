// dependencies
const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const google = require('googleapis');
const GoogleAuth = require('google-auth-library');
const _ = require('lodash');
const nodemailer = require('nodemailer');
const request = require('request');
const sheets = google.sheets('v4');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true,
}));

// create and store credentials
const creds = require('./client_secret.json');
const token = require('./token.json');
const clientSecret = creds.installed.client_secret;
const clientId = creds.installed.client_id;
const redirectUrl = creds.installed.redirect_uris[0];
const authorization = new GoogleAuth();
const oauth2Client = new authorization.OAuth2(clientId, clientSecret, redirectUrl);
oauth2Client.credentials = token;
const auth = oauth2Client;

// Credentials and template for swipe-in email
const emailCreds = fs.readFileSync('./emailCreds.txt', 'utf8');
const emailTemp = fs.readFileSync('./emailTemp.txt', 'utf8');
const bodyTemp = _.template(emailTemp);

// Template for export data
const exportTemp = fs.readFileSync('./exportTemp.txt', 'utf8');
const dataTemp = _.template(exportTemp);

// set default time-zone for timestamps
process.env.TZ = 'America/New_York';

/*
 * Returns ValueRange object required by spreadsheets.values.update
 */
const getValueRange = (range, values, spreadsheetId) => ({
  auth,
  spreadsheetId,
  range,
  valueInputOption: 'USER_ENTERED',
  resource: {
    values,
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
    auth,
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
    else resolve(res);
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
    if (error) {
      reject();
      return;
    }
    // Format the object returned from school
    let student;
    try {
      student = JSON.parse(body); // throws error if not json object
    } catch (err) {
      reject();
      return;
    }
    // format the fetched values
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
    auth,
    spreadsheetId,
  }, (err, res) => {
    if (err) reject();
    else {
      res.sheets.forEach(x => ensureHeaders(spreadsheetId, x.properties.title));
      resolve(res);
    }
  });
});

/*
 * Fetches all cell data from specified sheet, for exporting
 */
const getSpreadsheetData = (spreadsheetId, range) => new Promise((resolve, reject) => {
  sheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range,
  }, (err, res) => {
    if (err) reject();
    else resolve(res);
  });
});

/*
 * Sample email function for testing purposes,
 * send confirmation of attendance email upon swipe-in
 */
const emailStudent = (email, timestamp, name) => {
  const transporter = nodemailer.createTransport(emailCreds);

  // setup e-mail data with unicode symbols
  const mailOptions = {
    from: '<strousoglou@gmail.com>', // sender address
    to: email, // list of receivers
    subject: 'Welcome to CS50 Office Hours', // Subject line
    // text: 'Hello world 🐴', // plaintext body
    html: bodyTemp({
      timestamp,
      name,
    }),
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log('Message sent: ' + info.response);
  });
};

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
      auth,
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
        if (values[4].userEnteredValue.stringValue === 'stylianos.rousoglou@yale.edu') {
          emailStudent(values[4].userEnteredValue.stringValue,
            values[1].userEnteredValue.stringValue,
            values[2].userEnteredValue.stringValue);
        }
        res.send(values);
      }
    });
  }).catch(() => res.send('fail'));
});

const processData = data => {
  // TODO: figure it out somehow, maybe as parameter?
  const startTime = '14:00:00';
  // remove headers from data
  data.values.shift();
  const students = data.values;
  // require staff netids file
  const staffFile = fs.readFileSync('./staff.txt', 'utf8');
  // staff netids in array 'staff', remove empty lines
  const staff = staffFile.split('\n').filter(s => s !== '');
  // regex to match time
  const getTime = /..:..:../;

  // staff
  const late = [];
  const rest = [];
  // students
  const allStudents = [];
  const emails = [];

  students.forEach(id => {
    // extract time
    const time = id[1].match(getTime);
    const checkIn = time[0];
    if (staff.indexOf(id[0]) !== -1) {
      // staff
      if (checkIn > startTime) {
        late.push(`${checkIn}  ${id[2]} ${id[3]}`);
      } else {
        rest.push(`${checkIn}  ${id[2]} ${id[3]}`);
      }
    } else {
      // students
      allStudents.push(`${checkIn}  ${id[2]} ${id[3]}`);
      if (id[4]) emails.push(id[4]);
    }
  });

  return dataTemp({
    staff_num: late.length + rest.length,
    late_staff_num: late.length,
    list_late_staff: late.join('\n'),
    rest_of_staff: rest.join('\n'),
    student_num: allStudents.length,
    list_students: allStudents.join('\n'),
    student_emails: emails.join('\n'),
  });
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
  .catch(() => res.send('fail'));
});

app.listen(3000);
