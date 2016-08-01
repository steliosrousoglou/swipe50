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
// rich text area from swipe-in email customization and button
const emailTextPreview = document.querySelector('.textarea');
const emailTextEdit = document.querySelector('.text-edit');
// const emailButton = document.querySelector('.text-area-button');
const emailDefault = document.querySelector('.email-default');
const emailSave = document.querySelector('.email-save');
const emailCancel = document.querySelector('.email-cancel');
const emailPreview = document.querySelector('.email-preview');

const page2 = document.querySelector('.page-2');
const page3 = document.querySelector('.page-3');

let spreadsheetId;
let spreadsheetName;
let sheetId;
let sheetName;

const hideSwipe = (hide) => {
  swipeReader.disabled = hide;
  exportButton.disabled = hide;
};

const getDefaultEmail = () => {
  fetch(`${host}/defaultEmail`, { method: 'GET' })
  .then(res => res.text())
  .then(text => {
    emailTextEdit.value = text;
  })
  .catch(() => {});
};

sheetUrl.value = localStorage.getItem('lastUrl'); // last session url
emailTextEdit.innerHTML = localStorage.getItem('emailText'); // last email draft
sheetUrl.focus(); // url textbox has focus
emailTextPreview.classList.toggle('hidden');
hideSwipe(true);

/*
 * Determines whether url contains valid spreadsheet ID
 * If it does, sets global spreadsheetId and sheetId (0 by default)
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

/*
 * Makes get request to server, notifying the
 * user if the sheet is not writeable.
 * If it is, enables swipe textbox
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
    }
  })
  .catch(err => {
    alert(`Cannot connect to server: ${err}`);
  });
};

/*
 * Batch get request to obtain spreadsheet title
 * and array of available sheets (to render dropdown)
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
  .catch(err => console.log(`Cannot get sheet information: ${err}`));
};

/*
 * Makes post request to server with entered information
 */
const swipeIn = netid => {
  if (netid === '24688') netid = 'hpa5';
  if (netid === '45672') netid = 'dwp7';

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
  })
  .catch(err => {
    alert(`Failed to swipe in: ${err}`);
  });
};

/*
 * Requests all data from selected sheet and provides
 * useful information and stats
 */
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
  .catch(() => {
    alert(`Failed to export data from ${sheetName}`);
  });
};

/*
 * Event listener for url submission.
 * Upon submission, validates url
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
 * Event listener for swiping, triggered by <return>
 * Attempts to swipe in person, then clears the textbox
 */
swipeReader.addEventListener('keyup', e => {
  if (e.keyCode === 13) {
    swipeIn(e.target.value);
    e.target.value = '';
  }
});

/*
 * Event listener for drop-down sheet selector
 */
dropDown.addEventListener('change', e => {
  hideSwipe(true);
  sheetId = e.target.value;
  sheetName = dropDown.options[dropDown.selectedIndex].text;
  label.innerHTML =
    `Writing to <a href="${localStorage.getItem('lastUrl')}"> ${spreadsheetName}, ${sheetName}`;
  isWriteable();
  page2.scrollIntoView();
});

/*
 * Event listener for export button
 */
exportButton.addEventListener('click', () => {
  exportData();
});

/*
 * Event listener for edit email text-area
 */
emailPreview.addEventListener('click', () => {
  // toggle email text area
  emailTextPreview.innerHTML = emailTextEdit.value;
  emailTextPreview.classList.toggle('hidden');
  emailTextEdit.classList.toggle('hidden');
});

/*
 * Event listener for get default email text
 */
emailDefault.addEventListener('click', () => {
  getDefaultEmail();
});

/*
 * Event listener storing the drafted email in local storage
 */
emailSave.addEventListener('click', () => {
  localStorage.setItem('emailText', emailTextEdit.value);
  swipeReader.focus();
  page3.scrollIntoView();
});

/*
 * Event listener for reverting email to last saved state
 */
emailCancel.addEventListener('click', () => {
  emailTextEdit.value = localStorage.getItem('emailText');
});
