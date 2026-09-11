# Seven Six Pressure Washing

Static GitHub Pages website for Seven Six Pressure Washing LLC.

## Connect the quote form to Google Sheets

1. Create or open the Google Sheet that will receive quote requests.
2. In the Sheet, open **Extensions → Apps Script**.
3. Replace the editor contents with `apps-script.gs` from this repository.
4. Run `setupQuoteSheet` once and approve the requested Sheets, Drive, and email permissions.
5. Select **Deploy → New deployment → Web app**. Execute as yourself and allow access to anyone.
6. Copy the deployed URL ending in `/exec` and paste it between the quotes in `const SCRIPT_URL = '';` at the top of `script.js`.
7. Commit the updated `script.js`. GitHub Pages will publish the connected form.

The script stores quote details on the `Quotes` tab, saves uploaded photos in a private Drive folder named `Seven Six Quote Photos`, records their Drive links, and attaches the photos to the notification email.
