const express = require('express');
const multer = require('multer');
const log4js = require('log4js');
const { exec, spawn } = require('child_process');
const uuidv4 = require('uuid/v4');
const fs = require('fs');

const SHELL_FILE = './run-julius.sh';
const TMP_DIR = './tmp';
const port = 3000;

// Logger
const logger = log4js.getLogger();
logger.level = 'info';

// Error Catch
process.on('uncaughtException', (err) => {
  logger.error('unhandled exception has occured');
  logger.error(err);
});

const storage = multer.diskStorage({
  destination: TMP_DIR,
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}.wav`);
  },
});
const upload = multer({ storage });

// start Julius
const child = spawn(SHELL_FILE);
child.stdin.setEncoding('utf-8');

function readVoiceData(voiceFile) {
  child.stdin.write(`${voiceFile}\n`);
}

// initialize express
const app = express();

app.use('/api/julius', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.listen(port, () => {
  logger.info(`listening on port ${port} ...`);
});

// speech to text
app.post('/api/julius/speech', upload.single('voice'), (req, res) => {
  const inputFile = `${TMP_DIR}/${req.file.filename}`;
  const outputFile = `${TMP_DIR}/c_${req.file.filename}`;

  child.stdout.on('data', (buf) => {
    const txt = buf.toString('UTF-8');
    // 音声認識失敗
    if (txt.match(/WARNING/)) {
      res.status(200);
      logger.info('voice recognition failure');
      res.json({ result: '' });

      fs.unlink(inputFile, (err) => {
        if (err) {
          logger.error('file delete failure');
        };
      });
      fs.unlink(outputFile, (err) => {
        if (err) {
          logger.error('file delete failure');
        };
      });
      return child.stdout.removeAllListeners('data');
    }

    // 音声認識結果のみ抽出
    if (txt.match(/sentence1/)) {
      const txtArr = txt.split(/\n/);
      const result = txtArr.filter(element => element.match(/sentence1/))[0].replace(/\[s\]/g, '').slice(10).trim();
      res.status(200);
      logger.info('voice recognition succeeded', result);
      res.json({ result });

      fs.unlink(inputFile, (err) => {
        if (err) {
          logger.error('File delete failure');
        };
      });
      fs.unlink(outputFile, (err) => {
        if (err) {
          logger.error('File delete failure');
        };
      });
      return child.stdout.removeAllListeners('data');
    }
  });
  exec(`sox ${inputFile} -c 1 -r 16000 ${outputFile}`, (err) => {
    if (err) {
      logger.fatal(err);
      res.json({ err });
    } else {
      readVoiceData(outputFile);
    }
  });
});
