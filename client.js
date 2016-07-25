const host = 'http://localhost:3000';

// url textbox
const sheetUrl = document.querySelector('.sheet-url');
// submit button for url textbox
const submitButton = document.querySelector('.submit-button');
// swipe textbox
const swipeReader = document.querySelector('.swipe-reader');
// drop-down menu for sheet selection
const dropDown = document.querySelector('.drop');


let spreadsheetId = localStorage.getItem('lastSpreadsheetId');
let sheetId;
let sheetName;

dropDown.style.visibility = 'hidden'; // hide initially
sheetUrl.value = localStorage.getItem('lastUrl');
sheetUrl.focus(); // initially url textbox has focus
swipeReader.disabled = true;  // initially, swipe textbox disabled

/**
 * Determines whether url contains valid spreadsheet ID
 */
const validateUrl = (url) => {
  const head = /spreadsheets\/d\//;
  const beg = url.search(head);
  // If no match, spreadsheetID will remain empty
  const firstHalf = (beg === -1) ? '' : url.substring(beg).substring(15);
  const tail = firstHalf.indexOf('/');
  const ID = (tail === -1) ? firstHalf : firstHalf.substring(0, tail);
  if (ID === '') return false;
  // store current session info
  localStorage.setItem('lastSpreadsheetId', ID);
  localStorage.setItem('lastUrl', url);
  // make the info available globally to client
  spreadsheetId = ID;
  sheetId = 0; // first sheet is default
  return true;
};

/**
 * Renders drop-down menu for user to
 * select sheet within the spreadsheet
 */
function renderDropdown(sheets) {
  dropDown.innerHTML = '';
  sheets.forEach((sheet, i) => {
    dropDown.options[i] =
      new Option(sheet.properties.title, sheet.properties.sheetId);
  });
  dropDown.style.visibility = 'visible';
}

/**
 * Batch get request to server to obtain spreadsheet
 * title and array of available sheets to render dropdown
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
    body: JSON.stringify(body),
  }).then(res => res.text())
  .then(res => {
    // console.log('RESPONSE I GOT: ', res);
    if (res === 'fail') alert('Spreadsheet info not retrievable');
    else {
      const response = JSON.parse(res);
      sheetName = response.properties.title;
      sheetUrl.value = `Writing to: ${sheetName}`;
      renderDropdown(response.sheets);
      swipeReader.disabled = false;
      swipeReader.focus();
    }
  })
  .catch(err => {
    console.log("Cannot get sheet information: " + err);
  });
};

/**
 * Makes get request to server, notifying the
 * user if the spreadsheet is not writeable.
 * If it is, enables swipe textbox
 */
const isWriteable = (type) => {
  const body = {
    spreadsheetId,
    sheetId,
  };

  fetch(`${host}/writeable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).then(res => res.text())
  .then(res => {
    // console.log('RESPONSE I GOT: ', res);
    if (res === 'fail') {
      // FOR APP TO WORK, FIRST SHEET *MUST* BE WRITEABLE
      if (type === 'sheet') {
        dropDown.selectedIndex = 0;
        sheetId = dropDown.options[0].value;
        sheetName = dropDown.options[0].text;
        alert("Sheet not writeable, switching to " + sheetName);
        swipeReader.focus();
      }
      else alert('Spreadsheet not writeable (make sure the first sheet is writeable)');
      // in fail case, if we were changing sheet, revert global heet name and sheetId
      // to local storage 'firstSheet', revert dropdown to first sheet
    } else {
      localStorage.setItem('lastSpreadsheetId', spreadsheetId);
      if (type === 'spreadsheet') getSpreadsheetInfo();
      else {
        sheetName = dropDown.options[dropDown.selectedIndex].text;
        swipeReader.focus();
      }
    }
  })
  .catch(err => {
    alert(`Cannot connect to server: ${err}`);
  });
};

/**
 * Makes post request to server with entered information
 */
const swipeIn = netid => {
  const body = {
    netid,
    spreadsheetId,
    sheetId,
  };
  fetch(`${host}/swipe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).then(res => {
    console.log('Updated sheet: ', res);
  }).catch(err => {
    console.log('Failed to swipe in: ', err);
  });
};

/**
 * Event listener for url submission.
 * Upon submission, validates url
 */
submitButton.addEventListener('click', () => {
  dropDown.style.visibility = 'hidden';
  swipeReader.disabled = true;
  if (validateUrl(sheetUrl.value)) {
    isWriteable('spreadsheet'); // try writing to the first sheet
  }
});

/**
 * Event listener for swiping, triggered by <return>
 * Attempts to swipe in person, then clears the textbox
 */
swipeReader.addEventListener('keyup', e => {
  if (e.keyCode === 13) {
    swipeIn(e.target.value);
    e.target.value = '';
  }
});

/**
 * Event listener for drop-down sheet selector
 */
dropDown.addEventListener('change', e => {
  sheetId = e.target.value;
  sheetName = dropDown.options[dropDown.selectedIndex].text;
  isWriteable('sheet');
});
