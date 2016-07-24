// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const host = 'http://localhost:3000';

// url textbox
const sheetUrl = document.querySelector('.sheet-url');
// submit button for url textbox
const submitButton = document.querySelector('.submit-button');
// swipe textbox
const swipeReader = document.querySelector('.swipe-reader');
// drop-down menu for sheet selection
const dropDown = document.querySelector('.drop');
dropDown.style.visibility = 'hidden'; // hide initially
sheetUrl.focus(); // initially url textbox has focus 
swipeReader.disabled = true;  // initially, swipe textbox disabled

/**
 * Event listener for url submission.
 * Upon submission, validates url
 */
submitButton.addEventListener('click', e => {
  dropDown.style.visibility = 'hidden';
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
  console.log(e.target.value);
  changeSheet(e.target.value);
});

/**
 * Makes post request to server with entered information
 */
function swipeIn(netid) {
  var body = {
    netid: netid
  };
  fetch(host + '/swipe', {
    method: 'POST', 
    headers: {
      "Content-Type": "application/json"
    }, 
    body: JSON.stringify(body)
  }).then(function(res) {
    return '';
  }).catch(function(err) {
    console.log('Failed to swipe in: ' + err);
  });
}

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
      isWriteable();
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
function isWriteable() {// GOT HERE
  fetch(host + '/writeable', {
    method: 'GET'
  }).then(function(res) {
    return res.text();
  }).then(function(res_text) {
    if(res_text === 'fail') alert("Spreadsheet not writeable");
    else {
      var response = JSON.parse(res_text);
      swipeReader.disabled = false;
      swipeReader.focus();
      sheetUrl.value = "Writing to: " + response.properties.title;
      renderDropdown(response);
    }
  }).catch(function(err) {
    alert("Cannot connect to server: " + err);
  });
}

/**
 * Renders drop-down menu for user to 
 * select sheet within the spreadsheet
 */
function renderDropdown(response) {
  dropDown.innerHTML = "";
  for (i=0; i<response.sheets.length; i++){
    dropDown.options[dropDown.options.length] = 
      new Option(response.sheets[i].properties.title, response.sheets[i].properties.sheetId);
  }
  dropDown.style.visibility = 'visible';
}

/**
 * Makes post request with the id
 * of the sheet selected by the user
 */
function changeSheet(sheetId) {
  var body = {
    sheetId: sheetId
  };

  fetch(host + '/changeSheet', {
    method: 'POST', 
    headers: {
      "Content-Type": "application/json"
    }, 
    body: JSON.stringify(body)
  }).then(function(res) {
    console.log("Changed sheet");
  }).catch(function(err) {
    alert("Failed to change sheet: " + err);
  });
}

authorize();