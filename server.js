'use strict';

// Load dotenv
require('dotenv').config();

// dotenv variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT || 3000;

// Dependencies
const methodOverride = require('method-override');
const superagent = require('superagent');
const express = require('express');
const cors = require('cors');
const app = express();

// Database Setup
const pg = require('pg');
const client = new pg.Client(DATABASE_URL);

// App (express)
app.use(cors());
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));

// Enable CSS
app.use(express.static('public'));

// Book Constructor
function Book(bookData) {
    this.image_url = bookData.imageLinks.thumbnail || 'https://placehold.it/200x300';
    this.title = bookData.title || 'Title Not Found';
    this.author = bookData.authors || 'Author not mentioned';
    this.description = bookData.description || 'No description found.';
    this.isbn = `${bookData.industryIdentifiers[0].type} ${bookData.industryIdentifiers[0].identifier}` || 'ISBN not available';
    this.bookshelf = `${bookData.categories}`;
}

// Routes
app.get('/', bookShelfFunction);
app.get('/searches/new', searchFunction);
app.post('/searches', resultsFunction);
app.post('/books', addBookFunction);
app.get('/books/:id', singleBookFunction);
app.post('/books/:id', readBookData);
app.put('/books/update/:id', updateBookForm);
app.delete('/books/delete/:id', deleteBook);
app.use('*', errorFunction);

// Handlers
function bookShelfFunction(request, response) {
    const selectAll = 'SELECT * FROM booky;';
    client.query(selectAll).then(bookData => {
        let books = bookData.rows.map((value) => value);
        const responseObject = { books: books };
        response.status(200).render('./pages/index', responseObject);
    });
}

// /searches
function searchFunction(request, response) {
    response.status(200).render('./pages/searches/new');
}
function resultsFunction(request, response) {
    let searchKey = request.body.search;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${searchKey}`;

    superagent.get(url).then(bookData => {
        let books = bookData.body.items.map((value, index) => {
            if (index < 10) { return (new Book(value.volumeInfo)); }
        });
        const responseObject = { books: books };
        response.status(200).render('./pages/searches/show', responseObject);
    }).catch(console.error);
}

// /books
function addBookFunction(request, response) {
    let newBook = request.body.bookData;
    const search = 'SELECT * FROM booky WHERE author=$1 AND title=$2 AND isbn=$3 AND image_url=$4 AND description=$5;';
    const select = 'SELECT * FROM booky;';
    const insert = 'INSERT INTO booky (author, title, isbn, image_url, description) VALUES($1,$2,$3,$4,$5);';

    client.query(search, newBook).then(bookData => {
        let bookId = bookData.rows[0].id;
        console.log('already in database');
        response.redirect(`/books/${bookId}`);
    }).catch(() => {
        console.log('Not existing in database');
        client.query(insert, newBook);
        client.query(select).then(bookData => {
            let i = Number(bookData.rows.length - 1);
            let bookId = bookData.rows[i].id.toString();
            response.redirect(`/books/${bookId}`);
        }).catch(console.error);
    });
}
function singleBookFunction(request, response) {
    const select = 'SELECT * FROM booky WHERE id=$1;';
    const bookId = [request.params.id];
    client.query(select, bookId).then(bookData => {
        const responseObject = { books: bookData.rows };
        response.render('pages/books/detail', responseObject);
    });
}
function readBookData(request, response) {
    const select = 'SELECT * FROM booky WHERE id=$1;';
    const bookId = [request.params.id];
    client.query(select, bookId).then(bookData => {
        const responseObject = { books: bookData.rows };
        response.render('pages/books/edit', responseObject);
    });
}


function updateBookForm(request, response) {
    const bookId = request.params.id.toString();
    const update = 'UPDATE booky SET (author, title, isbn, image_url, description)=($1,$2,$3,$4,$5) WHERE id=$6;';
    const updatedData = [request.body.author, request.body.title, request.body.isbn, request.body.image_url, request.body.description, bookId];

    client.query(update, updatedData).then(() => {
        response.redirect(`/books/${bookId}`);
    });
}
function deleteBook(request, response) {
    const bookId = request.params.id;
    const deleteSql = 'DELETE FROM booky WHERE id=$1;';
    const id = [bookId];
    client.query(deleteSql, id).then(() => {
        response.redirect(`/`);
    }).catch(console.error);
}

// *
function errorFunction(request, response) {
    response.status(404).render('./pages/error');
}

// Listen
client.connect().then(() => {
    app.listen(PORT, () => console.log(`You Successfully Connected To Port ${PORT}`));
}).catch(() => console.log(`Could not connect to database`));