const host = 'http://localhost:3000';

// url textbox
const sheetUrl = document.querySelector('.sheet-url');
// submit button for url textbox
const submitButton = document.querySelector('.submit-button');
// swipe textbox
const swipeReader = document.querySelector('.swipe-reader');
// drop-down menu for sheet selection
const dropDown = document.querySelector('.drop');

var spreadsheetID;
var sheetID;
var sheetName;

dropDown.style.visibility = 'hidden'; // hide initially
sheetUrl.focus(); // initially url textbox has focus 
swipeReader.disabled = true;  // initially, swipe textbox disabled

/**
 * Event listener for url submission.
 * Upon submission, validates url
 */
submitButton.addEventListener('click', e => {
  dropDown.style.visibility = 'hidden';
  sheetID = 0;
  validateUrl(sheetUrl.value);
});

/**
 * Event listener for swiping, triggered by <return>
 * Attempts to swipe in person, then clears the textbox
 */
swipeReader.addEventListener('keyup', e => {
  if(e.keyCode === 13) {
    swipeIn(e.target.value); 
    e.target.value = '';
  } 
});

/**
 * Event listener for drop-down sheet selector
 */
dropDown.addEventListener('change', e => {
  // changeSheet(e.target.value, e.target.index);
  sheetID = e.target.value;
  changeSheet(spreadsheetID, e.target.value, dropDown.options[dropDown.selectedIndex].text);
  // TODO: here pass false; i.e. don't render. but need to pass 
  //  spreadsheet and sheet ID as parameters
});

/**
 * Makes post request to server to authorize user
 */
function authorize() {
  fetch(host + '/authorize', {
    method: 'POST'
  }).then(function(res) {
    return res.text();
  }).then(function(res) {
    console.log(res);
  }).catch(function(err) {
    console.log('Failed to authorize: ' + err);
  });
}

/**
 * Makes post request to server to determine 
 * the validity of the provided url
 */
function validateUrl(url) {
  var body = {
      url: url
  };

  fetch(host + '/url', {
    method: 'POST', 
    headers: {
      "Content-Type": "application/json"
    }, 
    body: JSON.stringify(body)
  }).then(function(res) {
    return res.text();
  }).then(function(res_text) {
    if(res_text == 'invalid') {
      window.alert('Enter a valid sheets url');
    } else {
      spreadsheetID = res_text;
      isWriteable(true);
    }
  }).catch(function(err) {
    console.log('Failed to validate ID: ' + err);
  });
}

/**
 * Makes get request to server, notifying the
 * user if the spreadsheet is not writeable.
 * If it is, enables swipe textbox
 */

 //TODO : modify this to take in a boolean; true if it is checking 
 // if the spreadsheet is writeabe, so that we can disable/enable textboxes, 
 // false otherwise. In the back end this will determine whether the dropdown 
 // will be rendered again (because it happens in the back end's isWriteable)
function isWriteable(render){//(render) {
  var body = {
      spreadsheetId : spreadsheetID, 
      sheetId: sheetID, 
      sheet: '',
      ext: 'A1'//sheetID + 
  };

  fetch(host + '/writeable', {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    }, 
    body: JSON.stringify(body) 
  }).then(function(res) {
    return res.text();
  }).then(function(res_text) {
    if(res_text === 'fail'){
      
      // FOR APP TO WORK, FIRST SHEET *MUST* BE WRITEABLE
      alert("Spreadsheet not writeable");
    } else {
      var response = JSON.parse(res_text);
      swipeReader.disabled = false;
      swipeReader.focus();
      if(render) {
        sheetUrl.value = "Writing to: " + response.title;
        //sheetUrl.value = = "Writing to: " 
        renderDropdown(response.sheets); // this should take sheets json
      }
    }
  }).catch(function(err) {
    alert("Cannot connect to server: " + err);
  });
}

/**
 * Renders drop-down menu for user to 
 * select sheet within the spreadsheet
 */
// function renderDropdown(response) {
//   dropDown.innerHTML = "";
//   for (i=0; i<response.sheets.length; i++){
//     dropDown.options[dropDown.options.length] = 
//       new Option(response.sheets[i].properties.title, response.sheets[i].properties.sheetId);
//   }
//   dropDown.style.visibility = 'visible';
// }
function renderDropdown(response) {
  dropDown.innerHTML = "";
  for (i=0; i<response.length; i++){
    dropDown.options[dropDown.options.length] = 
      new Option(response[i].properties.title, response[i].properties.sheetId);
  }
  dropDown.style.visibility = 'visible';
}
/**
 * Makes post request with the id
 * of the sheet selected by the user
 */
function changeSheet(spreadsheetID, sheetId, title) {
  var body = {
    spreadsheetId: spreadsheetID,
    sheetId: sheetId, 
    sheet: title, 
    ext: '!A1'
  };

  fetch(host + '/writeable', {
    method: 'POST', 
    headers: {
      "Content-Type": "application/json"
    }, 
    body: JSON.stringify(body)
  }).then(function(res) {
    return res.text();
  }).then(function(res_text) {
    if(res_text === 'fail'){
      // FOR APP TO WORK, FIRST SHEET *MUST* BE WRITEABLE
      dropDown.selectedIndex = 0;
      sheetID = dropDown.options[dropDown.selectedIndex].value;
      alert("Sheet not writeable, switching to " + dropDown.options[dropDown.selectedIndex].text);
    } else {
      var parse = JSON.parse(res_text); // .title, .sheetId. .sheets
      sheetID = parse.sheetId; // set global sheetID
      sheetName = dropDown.options[dropDown.selectedIndex].text; // set global sheetName
    }
    swipeReader.disabled = false;
    swipeReader.focus();
  }).catch(function(err) {
    alert("Failed to change sheet: " + err);
  });
}

/**
 * Makes post request to server with entered information
 */
function swipeIn(netid) {
  var body = {
    netid: netid, 
    spreadsheetId: spreadsheetID, 
    sheetId: sheetID
  };
  fetch(host + '/swipe', {
    method: 'POST', 
    headers: {
      "Content-Type": "application/json"
    }, 
    body: JSON.stringify(body)
  }).then(function(res) {
    console.log('Server responded');
  }).catch(function(err) {
    console.log('Failed to swipe in: ' + err);
  });
}

authorize();