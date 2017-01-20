# About Swipe50

## What is it?
    
Allows you to swipe Harvard and Yale ID cards, whose holders' names, emails and timestamps will be stored in your google spreadsheet. Available to all Harvard/Yale credential holders. Note: Hardware (magnetic stipe reader or proximity reader) is required.
    
## How to use it

1. Create a new Google Spreadsheet
1. Open your spreadsheet, and click on the blue Share button (top right)
1. Click "Advanced" (bottom-left of Share window), and under "Who has access" hit "Change..." (in blue).
1. Select either "On - Anyone with the link" (recommended) OR "On - Public on the web" (not recommended)
1. Make sure "Access:" is set to "Can edit"
1. Connect the hardware to your computer 
1. Click "Save", then "Done". Copy the entire url from the URL bar (this is your spreadsheet's URL) and paste it into application's "Connect to Spreadsheet" url box 
1. Click Submit, then choose a specific sheet. 
1. Draft an email to send to attendees 
1. Start swiping!


# Notes

* The spreadsheet **must** exist
* The spreadhsheet **must** be writeable by anyone with the url (for cs50 staff, it **must** be writeable only by our service account)
* Sheet names **must not** contain the character `/`

# Features

* About page with detailed instructions about how to get started and use the application
* Detects if entered spreadsheet is valid and accessible
* Detects if specified sheet is writeable
* Warns user and disables swiping functionality if unable to write to sheet
* Allows drafting welcome email in HTML, previewing it, getting generic one, and saving for future sessions
* Sends welcome email to everyone who swipes in
* By swiping Harvard/Yale ID, swiper's information is appended to the end of the selected sheet. Each entry includes the fields: netid, timestamp, first name, last name, email address
* 'Export Data' button summarizes all entries present in the sheet and writes summary to the sheet: # of students attending, # and arrival time of all staff members (sorted by lateness)
* 'Get Email Addresses' displays (in a email-friendly copy-pastable list) the emails of everyone attending the event (in case admin wants to email everyone any new information)

# Running the server
Assuming `node` and dependencies are installed, the server is run by exectuing `node index.js` in the `server` directory. The environment variables `SWIPE50_API_USERNAME` and `SWIPE50_API_PASSWORD` should be set to be the username and password of the gw.its.yale.edu Yale API. The environment variable `SWIPE50_PASSWORD` should be set to a password heads@ need to know to make calls to the server
