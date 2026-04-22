# FrameShare Studio

FrameShare Studio is a static multi-page media sharing prototype built with plain HTML, CSS, and JavaScript. It lets users create shared spaces, join spaces, upload media into a selected space, view shared posts, track their own posts, and log authentication events into Google Sheets.

## Highlights

- Popup-based authentication gate that only appears when no active session exists
- Space creation with custom slug-based share links
- Join flow that accepts a saved space, slug, or share link
- Personal profile and "My Posts" pages
- Shared viewer page for a space
- Local browser persistence with `localStorage`, `sessionStorage`, and `IndexedDB`
- Optional Google Sheets logging through a Google Apps Script web app

## Project Structure

```text
.
|-- index.html
|-- login.html
|-- post.html
|-- my-posts.html
|-- profile.html
|-- space.html
|-- style.css
`-- js/
    |-- auth-gate.js
    |-- google-sheet-config.js
    |-- home.js
    |-- login.js
    |-- my-posts.js
    |-- post.js
    |-- profile.js
    |-- space.js
    `-- storage.js
```

## How It Works

### Authentication

Accounts are stored locally in the browser. Registration and login create a session that is reused across page navigation in the same tab session.

### Spaces and Posts

Spaces, memberships, and post metadata are stored in `localStorage`. Uploaded media files are stored in `IndexedDB` so the gallery can be reloaded without a server.

### Google Sheets Logging

The app supports sending auth events such as `register` and `login` to Google Sheets through a deployed Google Apps Script web app.

Current fields:

- `Timestamp`
- `Name`
- `Email`
- `Page`
- `Event Type`

## Local Setup

1. Download or clone the project.
2. Open the project folder.
3. Start a local server or open `index.html` directly in the browser.
4. Use the login flow to create an account.
5. Create a space, join it, and upload media.

## Google Sheets Setup

Update `js/google-sheet-config.js` with your deployed Apps Script web app URL:

```javascript
window.FrameShareGoogleSheetConfig = {
    formActionUrl: "",
    scriptUrl: "YOUR_APPS_SCRIPT_EXEC_URL",
    fields: {
        name: "",
        email: "",
        page: "",
        timestamp: "",
        eventType: ""
    }
};
```

Recommended Apps Script:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = ["Timestamp", "Name", "Email", "Page", "Event Type"];
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];

  const headerMissing = headers.some(function(header, index) {
    return firstRow[index] !== header;
  });

  if (headerMissing) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.appendRow([
    new Date(),
    e.parameter.name || "",
    e.parameter.email || "",
    e.parameter.page || "",
    e.parameter.eventType || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Notes

- This is currently a browser-only prototype, not a shared backend application.
- Spaces created on one device are not automatically available on another device.
- To support real cross-device collaboration, the space and post metadata would need to move to a shared backend or database.
