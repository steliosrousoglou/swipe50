#About Swipe50
    What is it?
    
      Allows you to swipe Harvard and Yale ID cards, whose holders' names, emails
      and timestamps will be stored in your google spreadsheet. Available to all
      Harvard/Yale credential holders. <br> <br> Note: Hardware (magnetic stipe reader or
      proximity reader) is required.
    
    How to use it

      1) Create a new Google Spreadsheet
      2) Open your spreadsheet, and click on the blue Share button (top right)
      3) Click "Advanced" (bottom-left of Share window), and under "Who has access"
      hit "Change..." (in blue).
      4) Select either "On - Anyone with the link" (recommended) OR
      "On - Public on the web" (not recommended)
      5) Make sure "Access:" is set to "Can edit"
      6) Connect the hardware to your computer 
      7) Click "Save", then "Done". Copy the entire url from the URL bar (this is your spreadsheet's
      URL) and paste it into application's "Connect to Spreadsheet" url box 
      8) Click Submit, then choose a specific sheet. 
      9) Draft an email to send to attendees 
      10) Start swiping!


#Notes:
The spreadsheet must exist<br>
The spreadhsheet <b>must</b> be writeable by anyone with the url (for cs50 staff, it *must* be writeable only by our service account)<br>

#Features
About page with detailed instructions about how to get started and use the application<br>
Detects if entered spreadsheet is valid and accessible<br>
Detects if specified sheet is writeable<br>
Warns user and disables swiping functionality if unable to write to sheet<br>
Allows drafting welcome email in HTML, previewing it, getting generic one, and saving for future sessions
Sends welcome email to everyone who swipes in
