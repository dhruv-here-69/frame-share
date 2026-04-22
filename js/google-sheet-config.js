window.FrameShareGoogleSheetConfig = {
    // Option 1: Paste your Google Form "formResponse" URL here.
    // Example:
    // formActionUrl: "https://docs.google.com/forms/d/e/FORM_ID/formResponse",
    formActionUrl: "",
    // Option 2: Paste your deployed Google Apps Script web app URL here.
    // Example:
    // scriptUrl: "https://script.google.com/macros/s/DEPLOYMENT_ID/exec",
    scriptUrl: "https://script.google.com/macros/s/AKfycbwitBJ_alcnUkUOlLM3QUDBDmzsTogc0DTxqLc-3aM0UJ3LORpfNmAAYgLw6w1VnA/exec",
    fields: {
        // Replace each entry ID below with the real Google Form field IDs.
        // Only needed when you use formActionUrl.
        // You can keep page, timestamp, and eventType blank if your form only needs name/email.
        name: "",
        email: "",
        page: "",
        timestamp: "",
        eventType: ""
    }
};
