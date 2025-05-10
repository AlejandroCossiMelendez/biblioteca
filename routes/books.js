const express = require('express');
const router = express.Router();

// Get all books
router.get('/', async (req, res) => {
    try {
        // Get db from request
        const { query } = req.db;
        
        // Execute query
        const result = await query('SELECT * FROM books ORDER BY name');
        console.log('Query result:', result);
        
        // Ensure we have an array of books
        const books = Array.isArray(result) ? result : [];
        
        // Render the view with the books array
        return res.render('books/index', {
            books: books,
            messages: req.flash()
        });
    } catch (error) {
        console.error('Error in books route:', error);
        req.flash('error', 'Failed to fetch books. Please try again.');
        return res.render('books/index', {
            books: [],
            messages: req.flash()
        });
    }
});

// Show add book form
router.get('/add', (req, res) => {
    res.render('books/add', { 
        messages: req.flash()
    });
});

// Add new book
router.post('/add', async (req, res) => {
    const { name, author } = req.body;
    const now = new Date();
    
    try {
        const { query } = req.db;
        await query('INSERT INTO books (name, author, created_at, updated_at) VALUES (?, ?, ?, ?)', 
            [name, author, now, now]);
        req.flash('success', 'Book added successfully!');
        res.redirect('/books');
    } catch (error) {
        console.error('Error adding book:', error);
        req.flash('error', 'Failed to add book. Please try again.');
        res.redirect('/books/add');
    }
});

// Show edit book form
router.get('/edit/:id', async (req, res) => {
    try {
        const { query } = req.db;
        const books = await query('SELECT * FROM books WHERE id = ?', [req.params.id]);
        
        if (!books || books.length === 0) {
            req.flash('error', 'Book not found.');
            return res.redirect('/books');
        }

        res.render('books/edit', { 
            book: books[0],
            messages: req.flash()
        });
    } catch (error) {
        console.error('Error fetching book:', error);
        req.flash('error', 'Failed to fetch book details. Please try again.');
        res.redirect('/books');
    }
});

// Update book
router.post('/update/:id', async (req, res) => {
    const { name, author } = req.body;
    const now = new Date();
    
    try {
        const { query } = req.db;
        await query('UPDATE books SET name = ?, author = ?, updated_at = ? WHERE id = ?',
            [name, author, now, req.params.id]);
        req.flash('success', 'Book updated successfully!');
        res.redirect('/books');
    } catch (error) {
        console.error('Error updating book:', error);
        req.flash('error', 'Failed to update book. Please try again.');
        res.redirect(`/books/edit/${req.params.id}`);
    }
});

// Delete book
router.get('/delete/:id', async (req, res) => {
    try {
        const { query } = req.db;
        await query('DELETE FROM books WHERE id = ?', [req.params.id]);
        req.flash('success', 'Book deleted successfully!');
    } catch (error) {
        console.error('Error deleting book:', error);
        req.flash('error', 'Failed to delete book. Please try again.');
    }
    res.redirect('/books');
});

module.exports = router;