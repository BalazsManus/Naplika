const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const server = express();
const port = 50019;

const userDataPath = process.argv[2];
const confpath = path.join(userDataPath, 'config.json');

server.use(bodyParser.json());
server.use(cors());

let db = loadDB();

function loadDB() {
    try {
        const data = fs.readFileSync(confpath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

server.post('/save', (req, res) => {
    let { key, value } = req.body;
    console.info(`[DB] Pushed: ${key} => ${value}`);

    const keys = key.split('.');
    let current = db;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }

    let lastKey = keys[keys.length - 1];
    if (lastKey.endsWith('$')) {
        lastKey = lastKey.slice(0, -1);
        current[lastKey] = value;
    } else {
        if (lastKey.endsWith('#')) {
            lastKey = lastKey.slice(0, -1);
        }

        if (!current[lastKey]) {
            current[lastKey] = {};
        }

        if (!current[lastKey][value]) {
            current[lastKey][value] = {};
        }
    }

    fs.writeFileSync(confpath, JSON.stringify(db), 'utf8');
    res.send({ success: true });
});

server.get('/get/:key', (req, res) => {
    let key = req.params.key;
    console.info(`[DB] Request for: ${key}`);
    let returnWholeObject = false;

    if (key.endsWith('#')) {
        key = key.slice(0, -1);
        returnWholeObject = true;
    }

    const keys = key.split('.');
    let current = db;

    for (let i = 0; i < keys.length; i++) {
        if (current[keys[i]] === undefined) {
            return res.send({ value: null });
        }
        current = current[keys[i]];
    }

    if (returnWholeObject) {
        res.send({ value: current });
    } else {
        res.send({ value: current });
    }
});

server.listen(port, async () => {
    console.log(`Overlay DB server started..., Port: ${port}`);
    console.warn('Do not open port or your data might get leaked.');
});