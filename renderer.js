// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const host = 'http://localhost:3000';

console.log('loaded script');

//URL Reader
const submitButton = document.querySelector('.submit-button');
const sheetUrl = document.querySelector('.sheet-url');
const swipeReader = document.querySelector('.swipe-reader');

sheetUrl.focus();
swipeReader.disabled = true;

submitButton.addEventListener('click', e => {;
  validateId(sheetUrl.value);
});


//Swipe Reader
swipeReader.addEventListener('keyup', e => {
  if(e.keyCode === 13) {
    swipeIn(e.target.value); 
    e.target.value = '';
  } 
});

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
    console.log('LOL.');
  });
}

function authorize() {
  fetch(host + '/authorize', {
    method: 'POST'
  }).then(function(res) {
    return res.text();
  }).then(function(res) {
    console.log(res);
  }).catch(function(err) {
    console.log('Failed to authorize.');
  });
}

function validateId(url) {
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
      window.alert('enter a valid sheets url');
    } else {
      isWriteable();
    }
  }).catch(function(err) {
    console.log('Failed to validate ID.');
  });
}

function isWriteable() {// GOT HERE
  fetch(host + '/writeable', {
    method: 'GET'
  }).then(function(res) {
    return res.text();
  }).then(function(res_text) {
    console.log('GOT RESPONSE FROM SERVER',res_text);
    if(res_text != 'success') alert("Spreadsheet not writeable");
    else {
      swipeReader.disabled = false;
      swipeReader.focus();
    }
  }).catch(function(err) {
    alert("Cannot connect to server. ");
  });
}

authorize();

// module.exports = {
//   authorize
// }

