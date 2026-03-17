const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const { DOMParser, XMLSerializer } = require('xmldom');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function getParagraphText(paragraph) {
  const textNodes = paragraph.getElementsByTagName('w:t');
  let text = '';
  for (let i = 0; i < textNodes.length; i++) {
    text += textNodes[i].textContent || '';
  }
  return text.trim();
}

function detectSectionsFromDocumentXml(xmlString) {
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
  const paragraphs = doc.getElementsByTagName('w:p');
  const sections = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const text = getParagraphText(paragraphs[i]);
    if (!text) continue;

    const clean = text.replace(/\s+/g, ' ').trim();

    if (clean.endsWith(':') && clean.length > 3 && !/^page$/i.test(clean)) {
      sections.push({
        id: `section_${i}`,
        label: clean
      });
    }
  }

  return sections;
}

function createParagraphNode(xmlDoc, textValue) {
  const paragraph = xmlDoc.createElement('w:p');
  const run = xmlDoc.createElement('w:r');
  const text = xmlDoc.createElement('w:t');

  if (/^\s|\s$/.test(textValue)) {
    text.setAttribute('xml:space', 'preserve');
  }

  text.appendChild(xmlDoc.createTextNode(textValue));
  run.appendChild(text);
  paragraph.appendChild(run);
  return paragraph;
}

function insertTextAfterMatchingHeadings(xmlString, valuesByLabel) {
  const xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml');
  const body = xmlDoc.getElementsByTagName('w:body')[0];
  const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'));

  for (const paragraph of paragraphs) {
    const headingText = getParagraphText(paragraph).replace(/\s+/g, ' ').trim();

    if (!headingText || !(headingText in valuesByLabel)) continue;

    const userText = (valuesByLabel[headingText] || '').trim();
    if (!userText) continue;

    const lines = userText.split(/\r?\n/);
    let insertAfter = paragraph;

    for (const line of lines) {
      const newParagraph = createParagraphNode(xmlDoc, line || ' ');
      if (insertAfter.nextSibling) {
        body.insertBefore(newParagraph, insertAfter.nextSibling);
      } else {
        body.appendChild(newParagraph);
      }
      insertAfter = newParagraph;
    }
  }

  return new XMLSerializer().serializeToString(xmlDoc);
}

ipcMain.handle('select-template', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose DOCX/DOTX template',
    filters: [{ name: 'Word Templates/Documents', extensions: ['docx', 'dotx'] }],
    properties: ['openFile']
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const buffer = fs.readFileSync(filePath);
  const zip = new PizZip(buffer);
  const documentXmlFile = zip.file('word/document.xml');

  if (!documentXmlFile) {
    return {
      canceled: false,
      filePath,
      sections: [],
      error: 'Could not find word/document.xml in the selected file.'
    };
  }

  const documentXml = documentXmlFile.asText();
  const sections = detectSectionsFromDocumentXml(documentXml);

  return {
    canceled: false,
    filePath,
    sections
  };
});

ipcMain.handle('generate-filled-docx', async (_event, payload) => {
  try {
    const { templatePath, valuesByLabel } = payload;
    const buffer = fs.readFileSync(templatePath);
    const zip = new PizZip(buffer);

    const documentXmlFile = zip.file('word/document.xml');
    if (!documentXmlFile) {
      throw new Error('Could not find word/document.xml in the template.');
    }

    const originalXml = documentXmlFile.asText();
    const updatedXml = insertTextAfterMatchingHeadings(originalXml, valuesByLabel);

    zip.file('word/document.xml', updatedXml);

    const result = await dialog.showSaveDialog({
      title: 'Save completed document',
      defaultPath: 'completed-document.docx',
      filters: [{ name: 'Word Document', extensions: ['docx'] }]
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    const outputBuffer = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    fs.writeFileSync(result.filePath, outputBuffer);

    return {
      canceled: false,
      savedTo: result.filePath
    };
  } catch (error) {
    return {
      canceled: false,
      error: error.message || String(error)
    };
  }
});
