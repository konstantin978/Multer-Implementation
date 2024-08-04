import express from 'express';
import fs from 'fs';
import multer from 'multer';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';

const app = express();
const upload = multer({ dest: 'public/uploads' });
const port = 3000;
const url = 'mongodb://localhost:27017';

const client = new MongoClient(url);

app.use(express.static('public'));
app.use(bodyParser.json());

app.post('/upload', upload.single('textfile'), (req, res) => {
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    console.log(fileContent);
    res.send('Ok');
});

app.post('/crowl', upload.single('textfile'), async (req, res) => {
    const { title } = req.body;
    console.log(req.file);
    
    if (!title || !req.file) {
        return res.status(400).send('Error: Title or file missing');
    }

    try {
        const content = fs.readFileSync(req.file.path, 'utf-8');

        await client.connect();
        const db = client.db('engine');
        const collection = db.collection('pages');

        const page = await collection.insertOne({ title: title, content: content.split(' ') });

        res.send(page);
    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        await client.close();
    }
});

app.get('/search', async (req, res) => {
    const term = req.query.q;
    if (!term) {
        return res.status(400).send('Error: Query parameter q is required');
    }

    try {
        await client.connect();
        const db = client.db('engine');
        const collection = db.collection('pages');

        const pages = await collection.find({ content: { $in: [term] } }).toArray();

        res.send(pages);
    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        await client.close();
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}!`);
});
