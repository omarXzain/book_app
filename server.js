'use strict';
// All Requirement
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const superagent = require('superagent');
const app = express();
app.use(cors());
app.use('/public', express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('./pages/index')
});
app.get('/search', (req, res) => {
    res.render('pages/searches/new');
});

// bookHandler Function
app.post('/searches', bookHandler);

function bookHandler(req, res) {
    let searchBook = req.body.search;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${searchBook}`;

    superagent.get(url)
        .then(bookData =>
            bookData.body.items.map((book) =>
                new Books(book)))
        .then((books) => {
            res.render('pages/searches/show', { bakbook: books });
        }).catch(err => console.log(err));
}

function Books(value) {
    this.images = value.volumeInfo.imageLinks.smallThumbnail;
    this.title = value.volumeInfo.title;
    this.author = value.volumeInfo.authors;
    this.description = value.volumeInfo.description;
}

// Error Handler
app.use('*', (request, response) => {
    response.render('pages/error');
});

app.listen(PORT, () => {
    console.log(`You Successfully Connected To Port ${PORT}`)
});
