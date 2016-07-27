const host = 'http://localhost:3000';

// url textbox
const sheetUrl = document.querySelector('.sheet-url');
// submit button for url textbox
const submitButton = document.querySelector('.submit-button');
// swipe textbox
const swipeReader = document.querySelector('.swipe-reader');
// drop-down menu for sheet selection
const dropDown = document.querySelector('.drop');
// button for exporting data
const exportButton = document.querySelector('.export-button');

let spreadsheetId;
let sheetId;
let sheetName;

const enableSwipe = () => {
  swipeReader.disabled = false;
  swipeReader.focus();
  exportButton.disabled = false;
};

const disableSwipe = () => {
  swipeReader.disabled = true;
  exportButton.disabled = true;
};

dropDown.style.visibility = 'hidden'; // hide dropdown initially
sheetUrl.value = localStorage.getItem('lastUrl'); // last session url
sheetUrl.focus();                     // url textbox has focus
disableSwipe();

/**
 * Determines whether url contains valid spreadsheet ID
 * If it does, sets global spreadsheetId and sheetId (0 by default)
 */
const validateUrl = (url) => {
  const match = /spreadsheets\/d\/(.*)\//;
  const result = url.match(match);
  // if ID empty, spreadsheet url invalid
  if (!result) return false;
  const ID = result[1];
  // store current session url in browser
  localStorage.setItem('lastUrl', url);
  // make the info available globally to client
  spreadsheetId = ID; // set global spreadsheetId
  sheetId = 0;  // global initial sheetId = 0 by default
  return true;
};

/**
 * Renders drop-down menu for user to
 * select sheet within the spreadsheet
 */
const renderDropdown = sheets => {
  // empty drop-down
  dropDown.innerHTML = '';
  sheets.forEach((sheet, i) => {
    dropDown.options[i] =
      new Option(sheet.properties.title, sheet.properties.sheetId);
  });
  dropDown.style.visibility = 'visible';
};

/**
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
    body: JSON.stringify(body),
  }).then(res => res.text())
  .then(res => {
    if (res === 'fail') alert('Spreadsheet info not retrievable');
    else {
      const response = JSON.parse(res);
      const spreadsheetName = response.properties.title;
      // Render sheet drop-down menu
      renderDropdown(response.sheets);
      // Write title in the url box
      sheetUrl.value = `Writing to: ${spreadsheetName}`;
      // Store name of default sheet (sheetId == 0)
      sheetName = response.sheets[0].properties.title;
    }
  })
  .catch(err => console.log(`Cannot get sheet information: ${err}`));
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
    if (res === 'fail') {
      // FOR APP TO WORK, FIRST SHEET *MUST* BE WRITEABLE
      if (type === 'sheet') alert(`Warning: ${sheetName} is not writeable!`);
      else alert('Spreadsheet not writeable (ensure first sheet is writeable)');
    } else {
      // get spreadsheet info when first writing to it
      if (type === 'spreadsheet') getSpreadsheetInfo();
      else sheetName = dropDown.options[dropDown.selectedIndex].text;
      // enable swipe and export
      enableSwipe();
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
  if (netid === '24688') netid = 'hpa5';
  if (netid === '45672') netid = 'dwp7';

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
  }).then(res => res.text()
  ).then(res => {
    if (res === 'fail') alert('Could not update student');
    else console.log('Updated sheet');
  })
  .catch(err => {
    console.log('Failed to swipe in: ', err);
  });
};

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
    body: JSON.stringify(body),
  }).then(res => res.text())
  .then(text => {
    console.log(text);
  })
  .catch(err => {
    console.log(`Error exporting sheet ${sheetName}: ${err}`);
    alert(`Failed to export data from ${sheetName}`);
  });
};

/**
 * Event listener for url submission.
 * Upon submission, validates url
 */
submitButton.addEventListener('click', () => {
  // hide drop-down, disable swipe at attempt to change spreadsheet
  dropDown.style.visibility = 'hidden';
  disableSwipe();
  if (validateUrl(sheetUrl.value)) {
    isWriteable('spreadsheet'); // try writing to the first sheet
  } else {
    sheetUrl.value = '';
    alert('Please enter valid url');
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
  disableSwipe();
  sheetId = e.target.value;
  sheetName = dropDown.options[dropDown.selectedIndex].text;
  isWriteable('sheet');
});

exportButton.addEventListener('click', () => {
  exportData();
});
