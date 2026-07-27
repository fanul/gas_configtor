function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('GAS Configtor')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
