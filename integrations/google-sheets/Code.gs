// Paste into the Apps Script editor. Script properties: SHEET_ID, ORDER_TOKEN.
// Sheet tab "Orders", header row: Received at | Order ref | Language | Name | Phone | Governorate | Address | Notes | Items | Subtotal (EGP) | Delivery fee (EGP) | Status
function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const sheetId = props.getProperty('SHEET_ID');
    const expected = props.getProperty('ORDER_TOKEN');
    if (!sheetId || !expected) throw new Error('Script properties are missing');
    const d = JSON.parse(e.postData.contents);
    if (d.token !== expected) return reply({ ok: false, error: 'Unauthorized' });
    const required = ['ref', 'name', 'phone', 'governorate', 'address', 'items', 'subtotal'];
    for (let i = 0; i < required.length; i++) {
      if (!String(d[required[i]] || '').trim()) return reply({ ok: false, error: 'Missing fields' });
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('Orders');
      if (!sheet) throw new Error('Sheet tab Orders was not found');
      sheet.appendRow([
        new Date(), safeCell(d.ref), safeCell(d.lang), safeCell(d.name),
        "'" + String(d.phone), // keep the leading zero
        safeCell(d.governorate), safeCell(d.address), safeCell(d.notes), safeCell(d.items),
        Number(d.subtotal) || 0,
        d.deliveryFee === '' || d.deliveryFee === null || d.deliveryFee === undefined ? '' : Number(d.deliveryFee),
        'New'
      ]);
    } finally {
      lock.releaseLock();
    }
    return reply({ ok: true });
  } catch (error) {
    console.error(error);
    return reply({ ok: false, error: 'Unable to save order' });
  }
}
function safeCell(value) {
  const text = String(value || '').trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text; // block spreadsheet formula injection
}
function reply(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
