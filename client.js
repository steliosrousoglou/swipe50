const host = 'http://localhost:3000';

// url textbox
const sheetUrl = document.querySelector('.sheet-url');
// submit button for url textbox
const submitButton = document.querySelector('.submit-button');
// "writing to" labeldfdfdfdfd
const label = document.querySelector('.current-spreadsheet');
// swipe textbox
const swipeReader = document.querySelector('.swipe-reader');
// drop-down menu for sheet selection
const dropDown = document.querySelector('.sheet-options');
// button for exporting data
const exportButton = document.querySelector('.export-button');
// welcome email functionality
const emailTextPreview = document.querySelector('.textarea');
const emailTextEdit = document.querySelector('.text-edit');
const emailDefault = document.querySelector('.email-default');
const emailSave = document.querySelector('.email-save');
const emailCancel = document.querySelector('.email-cancel');
const emailPreview = document.querySelector('.email-preview');
// get all emails functionality
const allEmails = document.querySelector('.all-emails');
const emailsArea = document.querySelector('.emails-area');
// about buttons
const about = document.querySelector('.about-button');
const totop = document.querySelector('.top-button');
// views
const page1 = document.querySelector('.page-1');
const page2 = document.querySelector('.page-2');
const page3 = document.querySelector('.page-3');
const page4 = document.querySelector('.page-4');

// current session global variables
let spreadsheetId;
let spreadsheetName;
let sheetId;
let sheetName;

// enables/disables swiping and export data functionality
const hideSwipe = (hide) => {
  swipeReader.disabled = hide;
  exportButton.disabled = hide;
  allEmails.disabled = hide;
};

sheetUrl.value = localStorage.getItem('lastUrl'); // last session url
emailTextEdit.innerHTML = localStorage.getItem('emailText'); // last email draft
sheetUrl.focus(); // url textbox has focus
emailsArea.classList.toggle('hidden');
emailTextPreview.classList.toggle('hidden');
hideSwipe(true);

/* Gets and writes default welcome email to edit-email textbox */
const getDefaultEmail = () => {
  fetch(`${host}/defaultEmail`, { method: 'GET' })
  .then(res => res.text())
  .then(text => {
    emailTextEdit.value = text;
  })
  .catch(() => {});
};

/*
 * Determines whether url contains valid spreadsheet ID
 * If it does, sets global spreadsheetId
 */
const validateUrl = (url) => {
  const match = /https:\/\/docs.google.com\/spreadsheets\/d\/(.*)\//;
  const result = url.match(match);
  // if no match, spreadsheet url invalid
  if (!result) return false;
  spreadsheetId = result[1]; // set global spreadsheetId
  // store current session url in browser
  localStorage.setItem('lastUrl', url);
  return true;
};

/*
 * Renders drop-down menu for user to
 * select sheet within the spreadsheet
 */
const renderDropdown = sheets => {
  dropDown.innerHTML = '';
  dropDown.options[0] = new Option('Choose sheet');
  dropDown.options[0].selected = true;
  dropDown.options[0].disabled = true;
  // render option for each sheet in the spreadsheet
  sheets.forEach((sheet, i) => {
    dropDown.options[i + 1] =
      new Option(sheet.properties.title, sheet.properties.sheetId);
  });
};

/* Post request to write data summary to sheet, alerts if unsuccessful */
const exportData = () => {
  const body = {
    spreadsheetId,
    sheetName,
  };

  fetch(`${host}/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body) })
  .then(res => res.text())
  .then(text => {
    if (text === 'fail') alert(`Failed to export data from ${sheetName}`);
  })
  .catch(() => alert(`Failed to export data from ${sheetName}`));
};

/* updates emailArea to contain all attendees' emails from sheet */
const getAllEmails = () => {
  const body = {
    spreadsheetId,
    sheetName,
  };

  fetch(`${host}/allEmails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body) })
  .then(res => res.text())
  .then(text => {
    if (text === 'fail') alert(`Failed to get emails from ${sheetName}.\nSheet names must NOT contains the character /.`);
    else emailsArea.innerHTML = text.split('\n').join('<br>');
  })
  .catch(() => alert(`Failed to get emails from ${sheetName}`));
};

/*
 * Alerts if the sheet is not writeable, enables swipe and data export is so
 */
const isWriteable = () => {
  const body = {
    spreadsheetId,
    sheetId,
  };

  fetch(`${host}/writeable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body) })
  .then(res => res.text())
  .then(res => {
    if (res === 'fail') alert(`Warning: ${sheetName} is not writeable!`);
    else {
      hideSwipe(false);  // enable swipe textbox
      page2.scrollIntoView();
      getAllEmails();
    }
  })
  .catch(() => console.log(`Cannot connect to server`));
};

/*
 * Obtains and sets spreadsheet title and array of available sheets
 */
const getSpreadsheetInfo = () => {
  const body = {
    spreadsheetId,
  };

  fetch(`${host}/spreadsheet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body) })
  .then(res => res.text())
  .then(res => {
    if (res === 'fail') alert('Could not find spreadsheet.');
    else {
      const response = JSON.parse(res);
      // render sheet options
      renderDropdown(response.sheets);
      spreadsheetName = response.properties.title;
    }
  })
  .catch(err => alert(`Cannot get sheet information: ${err}`));
};

/* Makes post request to server with swiped information */
const swipeIn = netid => {
  const body = {
    netid,
    spreadsheetId,
    sheetId,
    message: emailTextEdit.value,
  };
  fetch(`${host}/swipe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body) })
  .then(res => res.text())
  .then(res => {
    if (res === 'fail') alert('Could not update student');
    else getAllEmails();
  })
  .catch(err => alert(`Failed to swipe in: ${err}`));
};

/*
 * Event listener for url submit, alerts if url is invalid
 */
submitButton.addEventListener('click', () => {
  // empty dropdown and label, disable swipe
  label.innerHTML = '';
  dropDown.innerHTML = '';
  hideSwipe(true);
  // if url is valid, get spreadsheet info
  if (validateUrl(sheetUrl.value)) getSpreadsheetInfo();
  else alert('Please enter valid url');
});

/*
 * Event listener for changes in drop-down sheet selector
 */
dropDown.addEventListener('change', e => {
  hideSwipe(true);  // disable swiping
  // set new blobal sheet name and id
  sheetId = e.target.value;
  sheetName = dropDown.options[dropDown.selectedIndex].text;
  const lastUrl = localStorage.getItem('lastUrl');  // store url
  // creates "writing to" label
  label.innerHTML =
    `Writing to <a href="${lastUrl}" target="_blank"> ${spreadsheetName}</a>, ${sheetName}`;
  isWriteable();
});

/*
 * Event listener for swiping, triggered by <return>
 * Attempts to swipe in person, then clears the textbox
 */
swipeReader.addEventListener('keyup', e => {
  if (e.keyCode === 13) {
    swipeIn(e.target.value);
    e.target.value = '';
  }
});

/* Event listener for export and email buttons*/
exportButton.addEventListener('click', () => exportData());
allEmails.addEventListener('click', () => emailsArea.classList.toggle('hidden'));

/* Event listener for edit email text-area */
emailPreview.addEventListener('click', () => {
  // toggle email text area
  emailTextPreview.innerHTML = emailTextEdit.value;
  emailTextPreview.classList.toggle('hidden');
  emailTextEdit.classList.toggle('hidden');
});

/* Event listener for get default email text */
emailDefault.addEventListener('click', () => {
  getDefaultEmail();
});

/* Event listener storing the drafted email in local storage */
emailSave.addEventListener('click', () => {
  localStorage.setItem('emailText', emailTextEdit.value);
  swipeReader.focus();
  page3.scrollIntoView();
});

/* Event listener for reverting email to last saved state */
emailCancel.addEventListener('click', () => {
  emailTextEdit.value = localStorage.getItem('emailText');
});

/* Event listener for about button, scrolls about page into view */
about.addEventListener('click', () => {
  page4.scrollIntoView();
});

/* Event listener for back button, scrolls first page into view */
totop.addEventListener('click', () => {
  page1.scrollIntoView();
});
