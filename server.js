'use strict';
// All Requirement
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const superagent = require('superagent');
const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL);
const app = express();
app.use(cors());
app.use('/public', express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    let SQL = 'SELECT * FROM booky;'
    return client.query(SQL)
        .then(result => {

            res.render('./pages/index', { newResults: result.rows });
        });
});

app.get('/search', (req, res) => {
    res.render('pages/searches/new');
});

app.post('/add', (req, res) => {
    res.render('pages/searches/add', { books: req.body });
});

app.get(`/books/book_id`, detailsBook);
app.post('/searches', bookHandler);
app.post(`/books`, bookToDatabase);


function bookToDatabase(request, response) {
    const [author, title, isbn, image_url, description] = request.body.add;
    const addedBook = 'INSERT INTO booky (author, title, isbn, image_url, description) VALUES($1,$2,$3,$4,$5);';
    const newValues = [author, title, isbn, image_url, description];
    client.query(addedBook, newValues).then(() => {
        response.status(200).redirect('/');
    });
}


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

function detailsBook() {
    let SQL = 'SELECT * FROM booky WHERE id=$1;';
    let values = [req.params.task_id];
    return client.query(SQL, values)
        .then(result => {
            res.render('pages/book/details', { task: result.rows[0] });
        });
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
