const SHEET_NAME = 'Quotes';
const NOTIFY_EMAIL = '76pressurewashing@gmail.com';
const PHOTO_FOLDER_NAME = 'Seven Six Quote Photos';
const PHOTO_FOLDER_PROPERTY = 'SEVEN_SIX_PHOTO_FOLDER_ID';
const BUSINESS_TIME_ZONE = 'America/New_York';
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const HEADERS = [
  'Timestamp',
  'Name',
  'Phone',
  'Email',
  'Property Address',
  'Property Type',
  'Square Footage',
  'Services',
  'Preferred Contact',
  'Best Time',
  'Details',
  'Photo Links'
];

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    if (clean_(p.website, 200)) {
      return response_('OK');
    }

    const name = clean_(p.name, 120);
    const phone = clean_(p.phone, 60);
    const address = clean_(p.address, 250);
    const propertyType = clean_(p.propertyType, 80);

    if (!name || !phone || !address || !propertyType) {
      throw new Error('Missing required quote information.');
    }

    const email = clean_(p.email, 180);
    const squareFeet = clean_(p.squareFeet, 40);
    const services = readServices_(e);
    const contactMethod = clean_(p.contactMethod, 80);
    const bestTime = clean_(p.bestTime, 80);
    const details = clean_(p.details, 4000);
    const sheet = getQuoteSheet_();
    const savedPhotos = savePhotos_(p.photosJson, name);
    const photoLinks = savedPhotos.map((photo) => photo.url).join('\n');

    sheet.appendRow([
      new Date(),
      name,
      phone,
      email,
      address,
      propertyType,
      squareFeet,
      services,
      contactMethod,
      bestTime,
      details,
      photoLinks
    ]);
    const submittedRow = sheet.getLastRow();
    sheet.getRange(submittedRow, 1).setNumberFormat('MM/dd/yyyy h:mm a');
    sheet.getRange(submittedRow, 11, 1, 2).setWrap(true);

    const bodyLines = [
      'New quote request from the Seven Six Pressure Washing website',
      '',
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Email: ${email || 'Not provided'}`,
      `Property Address: ${address}`,
      `Property Type: ${propertyType}`,
      `Square Footage: ${squareFeet || 'Not provided'}`,
      `Services: ${services || 'Not provided'}`,
      `Preferred Contact: ${contactMethod || 'Not provided'}`,
      `Best Time: ${bestTime || 'Not provided'}`,
      `Photos: ${savedPhotos.length || 'None'}`
    ];

    if (photoLinks) {
      bodyLines.push('Photo links:', photoLinks);
    }

    bodyLines.push('', 'Additional Details:', details || 'None');
    const body = bodyLines.join('\n');

    const message = {
      to: NOTIFY_EMAIL,
      subject: `New Quote Request - ${name || 'Website Lead'}`,
      body,
      name: 'Seven Six Website'
    };

    if (email) {
      message.replyTo = email;
    }

    if (savedPhotos.length) {
      message.attachments = savedPhotos.map((photo) => photo.blob);
    }

    MailApp.sendEmail(message);
    return response_('OK');
  } catch (error) {
    console.error(error);
    return response_(`ERROR: ${error.message || error}`);
  }
}

function setupQuoteSheet() {
  getQuoteSheet_();
  getPhotoFolder_();
}

function getQuoteSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('This script must be attached to a Google Sheet.');
  }

  if (spreadsheet.getSpreadsheetTimeZone() !== BUSINESS_TIME_ZONE) {
    spreadsheet.setSpreadsheetTimeZone(BUSINESS_TIME_ZONE);
  }

  if (spreadsheet.getSpreadsheetTimeZone() !== BUSINESS_TIME_ZONE) {
    spreadsheet.setSpreadsheetTimeZone(BUSINESS_TIME_ZONE);
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    HEADERS.forEach((header, index) => {
      if (!existingHeaders[index]) {
        sheet.getRange(1, index + 1).setValue(header);
      }
    });
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  return sheet;
}

function readServices_(e) {
  const values = e && e.parameters && e.parameters.services;

  if (!values) {
    return '';
  }

  return values.map((value) => clean_(value, 100)).filter(Boolean).join(', ');
}

function savePhotos_(photosJson, customerName) {
  if (!photosJson) {
    return [];
  }

  let photos;

  try {
    photos = JSON.parse(photosJson);
  } catch (error) {
    throw new Error('Photo data was not valid.');
  }

  if (!Array.isArray(photos) || photos.length > MAX_PHOTOS) {
    throw new Error(`A maximum of ${MAX_PHOTOS} photos is allowed.`);
  }

  if (!photos.length) {
    return [];
  }

  const timestamp = Utilities.formatDate(new Date(), BUSINESS_TIME_ZONE, 'yyyy-MM-dd_HHmmss');
  const customer = safeFilename_(customerName) || 'customer';

  const validatedPhotos = photos.map((photo, index) => {
    const type = clean_(photo && photo.type, 100).toLowerCase();
    const data = photo && photo.data ? String(photo.data) : '';
    const reportedSize = Number(photo && photo.size);

    if (ALLOWED_PHOTO_TYPES.indexOf(type) === -1) {
      throw new Error('Only JPEG, PNG, and WebP photos are allowed.');
    }

    if (!data || !Number.isFinite(reportedSize) || reportedSize < 1 || reportedSize > MAX_PHOTO_BYTES) {
      throw new Error('Each photo must be 5 MB or smaller.');
    }

    const bytes = Utilities.base64Decode(data);

    if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) {
      throw new Error('Each photo must be 5 MB or smaller.');
    }

    const extension = extensionForType_(type);
    const fileName = `${timestamp}_${customer}_${index + 1}.${extension}`;
    const blob = Utilities.newBlob(bytes, type, fileName);

    return {
      blob
    };
  });

  const folder = getPhotoFolder_();
  return validatedPhotos.map((photo) => {
    const file = folder.createFile(photo.blob);
    return {
      blob: photo.blob,
      url: file.getUrl()
    };
  });
}

function getPhotoFolder_() {
  const properties = PropertiesService.getScriptProperties();
  const storedId = properties.getProperty(PHOTO_FOLDER_PROPERTY);

  if (storedId) {
    try {
      return DriveApp.getFolderById(storedId);
    } catch (error) {
      properties.deleteProperty(PHOTO_FOLDER_PROPERTY);
    }
  }

  const matchingFolders = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  const folder = matchingFolders.hasNext() ? matchingFolders.next() : DriveApp.createFolder(PHOTO_FOLDER_NAME);
  properties.setProperty(PHOTO_FOLDER_PROPERTY, folder.getId());
  return folder;
}

function extensionForType_(type) {
  if (type === 'image/png') {
    return 'png';
  }

  if (type === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

function safeFilename_(value) {
  return clean_(value, 80)
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function clean_(value, maxLength) {
  return value == null
    ? ''
    : String(value).trim().replace(/[<>]/g, '').slice(0, maxLength || 500);
}

function response_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
