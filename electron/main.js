const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const { DOMParser, XMLSerializer } = require('xmldom');

let mainWindow;
let splashWindow = null;
let splashShownAt = 0;

function getSplashDelay() {
  const minimumVisibleDuration = 1800;
  const elapsed = Date.now() - splashShownAt;

  return Math.max(0, minimumVisibleDuration - elapsed);
}

function closeSplashWindow(forceImmediate = false) {
  if (!splashWindow || splashWindow.isDestroyed()) {
    splashWindow = null;
    return;
  }

  const delay = forceImmediate ? 0 : getSplashDelay();
  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    splashWindow = null;
  }, delay);
}

function createSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) return splashWindow;

  splashShownAt = Date.now();
  const splash = new BrowserWindow({
    width: 440,
    height: 300,
    frame: false,
    transparent: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    center: true,
    backgroundColor: '#111111',
    webPreferences: {
      sandbox: true
    }
  });

  const splashHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>DOCX Filler</title>
        <style>
          :root { color-scheme: dark; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1), transparent 42%),
              linear-gradient(160deg, #252525 0%, #101010 100%);
            color: #f5f5f6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            overflow: hidden;
          }
          .splash {
            display: grid;
            justify-items: center;
            gap: 15px;
            text-align: center;
          }
          .mark {
            width: 104px;
            height: 104px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 28px;
            background:
              linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03)),
              #2d2d2f;
            box-shadow: 0 22px 42px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.12);
          }
          .document {
            width: 48px;
            height: 62px;
            position: relative;
            border-radius: 8px;
            background: #f5f5f6;
            box-shadow: 0 10px 22px rgba(0,0,0,0.28);
          }
          .document::before {
            content: "";
            position: absolute;
            right: 0;
            top: 0;
            width: 17px;
            height: 17px;
            border-radius: 0 8px 0 5px;
            background: linear-gradient(135deg, #cfd1d5 0 50%, #2d2d2f 51% 100%);
          }
          .document::after {
            content: "";
            position: absolute;
            left: 10px;
            top: 21px;
            width: 28px;
            height: 25px;
            border-top: 4px solid #246bfe;
            border-bottom: 4px solid #246bfe;
            box-shadow: 0 10px 0 #246bfe;
          }
          h1 {
            margin: 0;
            font-size: 27px;
            line-height: 1;
            font-weight: 800;
            letter-spacing: 0;
          }
          p {
            margin: 0;
            color: rgba(245,245,246,0.7);
            font-size: 14px;
          }
          .loader {
            width: 168px;
            height: 5px;
            overflow: hidden;
            border-radius: 999px;
            background: rgba(255,255,255,0.14);
            position: relative;
            margin-top: 5px;
          }
          .loader::after {
            content: "";
            position: absolute;
            inset: 0;
            width: 44%;
            border-radius: inherit;
            background: linear-gradient(90deg, #246bfe, #85adff);
            animation: loading 1.08s ease-in-out infinite;
          }
          @keyframes loading {
            from { transform: translateX(-120%); }
            to { transform: translateX(260%); }
          }
        </style>
      </head>
      <body>
        <div class="splash">
          <div class="mark" aria-hidden="true">
            <div class="document"></div>
          </div>
          <h1>DOCX Filler</h1>
          <p>Preparing document tools...</p>
          <div class="loader" aria-hidden="true"></div>
        </div>
      </body>
    </html>
  `;

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
  splash.once('ready-to-show', () => {
    splash.show();
  });
  splash.on('closed', () => {
    if (splashWindow === splash) splashWindow = null;
  });

  splashWindow = splash;
  return splash;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    backgroundColor: '#111111',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    const reveal = () => {
      closeSplashWindow(true);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
      }
    };
    const delay = splashWindow ? getSplashDelay() : 0;
    setTimeout(reveal, delay);
  });

  mainWindow.webContents.once('did-fail-load', () => {
    closeSplashWindow(true);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createSplashWindow();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplashWindow();
    createWindow();
  }
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
