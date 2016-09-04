const SEND_EMAILS = false;

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
app.use(bodyParser.text());
app.use(bodyParser.urlencoded({
  extended: true,
}));

// create and store credentials
const creds = require('./client_secret.json');  // TODO: change
const token = require('./token.json');          // TODO: change
const clientSecret = creds.installed.client_secret;
const clientId = creds.installed.client_id;
const redirectUrl = creds.installed.redirect_uris[0];
const authorization = new GoogleAuth();
const oauth2Client = new authorization.OAuth2(clientId, clientSecret, redirectUrl);
oauth2Client.credentials = token;
const auth = oauth2Client;

// Credentials and template for swipe-in email
const emailCreds = fs.readFileSync('./emailCreds.txt', 'utf8'); // TODO: change
const emailTemp = fs.readFileSync('./emailTemp.txt', 'utf8');

// set default time-zone for timestamps
process.env.TZ = 'America/New_York';

/*
 * Returns ValueRange object required by spreadsheets.values.update
 */
const getValueRange = (range, values, spreadsheetId, md) => ({
  auth,
  spreadsheetId,
  range,
  valueInputOption: 'USER_ENTERED',
  resource: {
    values,
    major_dimension: md,
  },
});

/*
 * Writes headers to the first row of the specified sheet
 */
const ensureHeaders = (spreadsheetId, sheetTitle) => {
  sheets.spreadsheets.values.update(getValueRange(
    `${sheetTitle}!A1:E1`,
    [['netID', 'Timestamp', 'First Name', 'Last Name', 'email']],
    spreadsheetId, 'ROWS'
  ), () => {});
};

/*
 * Writes summary data to the sheet; # of students and staff,
 * time of staff members' arrival
 */
const writeExport = (data, spreadsheetId, sheetTitle) => {
  const headers = [['# Students:', data[1]], ['# Staff:', data[0].length]];
  sheets.spreadsheets.values.update(getValueRange(
    `${sheetTitle}!G:H`,
    headers.concat(data[0]),
    spreadsheetId, 'ROWS'
    ), () => {});
};

/*
 * Attempt to write to cell (0, 25) of specified sheet. Determines
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
 * Makes POST request to Yale API and resolves with student information
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
 * Resolves with information about the spreadsheet and initializes
 * the first row of every sheet to the standard headers
 */
const getSpreadsheet = spreadsheetId => new Promise((resolve, reject) => {
  sheets.spreadsheets.get({
    auth,
    spreadsheetId,
  }, (err, res) => {
    if (err) reject();
    else {
      res.sheets.forEach(x => {
        if (x) ensureHeaders(spreadsheetId, x.properties.title);
      });
      resolve(res);
    }
  });
});

/*
 * Resolves with all cell data from specified sheet, if successful
 */
const getSpreadsheetData = (spreadsheetId, sheetName) => new Promise((resolve, reject) => {
  sheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: `${sheetName}!A:E`,
  }, (err, res) => {
    if (err) reject();
    else resolve(res);
  });
});

/*
 * Sends email to student with specified body, making template substitutions
 */
const emailStudent = (email, name, message) => {
  const transporter = nodemailer.createTransport(emailCreds);
  const bodyTemp = _.template(message);
  // setup e-mail data with unicode symbols
  const mailOptions = {
    from: 'yaleheads@gmail.com', // sender address
    to: email, // student
    subject: 'Welcome to CS50 Office Hours', // Subject line
    html: bodyTemp({
      name,
    }),
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (err) => {
    if (err) return;
  });
};

/*
 * Processes swipe data from specified sheet and returns
 * number of students and sign-in times of staff
 */
const processData = data => {
  // require staff netids file
  const staffFile = fs.readFileSync('./staff.txt', 'utf8');
  // staff netids in array 'staff', remove empty lines
  const staff = staffFile.split('\n').filter(s => s !== '');
  // regex to match time
  const getTime = /..:..:../;

  const allStudents = [];
  const allStaff = [];

  // remove headers and empty lines from data
  data.values.shift();
  // filter attendees
  data.values.filter(x => x.length > 0).forEach(id => {
    // extract time from timestamp
    const time = id[1].match(getTime);
    const checkIn = time[0];
    if (staff.indexOf(id[0]) !== -1) {
      // staff
      allStaff.push([checkIn, `${id[2]} ${id[3]}`]);
    } else {
      // students
      allStudents.push(`${checkIn}  ${id[2]} ${id[3]}`);
    }
  });

  // Staff sorted by lateness
  const sortedStaff = allStaff.sort((a, b) => {
    if (a[0] < b[0]) return 1;
    if (a[0] > b[0]) return -1;
    return 0;
  });

  return [sortedStaff, allStudents.length];
};

/*
 * Extracts emails from sheet, removes duplicates and returns
 * as string of newline-separated emails
 */
const allEmails = data => {
  const emails = [];

  // remove headers and empty lines from data
  data.values.shift();
  // filter attendees' emails
  data.values.filter(x => x.length > 0).forEach(id => {
    if (id[4]) emails.push(id[4]);
  });
  // remove duplicates and return as string
  return Array.from(new Set(emails)).join('\n');
};

/*
 * Endpoint to determine if specified sheet is writeable, responds
 * with keyword 'fail' if it is not.
 */
app.post('/writeable', (req, res) => {
  isWriteable(req.body.spreadsheetId, req.body.sheetId)
  .then(() => res.send())
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
      else { // TODO: fix this, just precaution for now
        if (SEND_EMAILS) {
          emailStudent(values[4].userEnteredValue.stringValue,
            values[2].userEnteredValue.stringValue, req.body.message);
        }
        res.send(values);
      }
    }); })
  .catch(() => res.send('fail'));
});

/*
 * Endpoint to send all cell data available on specified sheet
 * for purposes of analyzing attendance
 * TODO: post request should ONLY happen if logged in with heads credentials
 */
app.post('/export', (req, res) => {
  getSpreadsheetData(req.body.spreadsheetId, req.body.sheetName)
  .then(body => processData(body))
  .then((data) => writeExport(data, req.body.spreadsheetId, req.body.sheetName))
  .then(() => res.send())
  .catch(() => res.send('fail'));
});

/*
 * Sends default welcome email to client
 */
app.get('/defaultEmail', (req, res) => {
  res.send(emailTemp);
});

/*
 * Sends all attendees' emails from specified sheet to client
 */
app.post('/allEmails', (req, res) => {
  getSpreadsheetData(req.body.spreadsheetId, req.body.sheetName)
  .then(body => allEmails(body))
  .then((emails) => res.send(emails))
  .catch(() => res.send('fail'));
});

app.listen(3000);
