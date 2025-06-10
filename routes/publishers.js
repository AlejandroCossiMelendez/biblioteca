const express = require('express');
const router = express.Router();

// Get all publishers
router.get('/', async (req, res) => {
    try {
        const { query } = req.db;
        const publishers = await query('SELECT * FROM publishers WHERE state = 1 ORDER BY name');
        
        return res.render('publishers/index', {
            publishers: publishers,
            messages: req.flash()
        });
    } catch (error) {
        // console.error('Error in publishers route:', error);
        req.flash('error', 'Failed to fetch publishers. Please try again.');
        return res.render('publishers/index', {
            publishers: [],
            messages: req.flash()
        });
    }
});

// Show add publisher form
router.get('/add', (req, res) => {
    res.render('publishers/add', { messages: req.flash() });
});

// Add new publisher
router.post('/add', async (req, res) => {
    const { name } = req.body;
    try {
        const { query } = req.db;
        // Validar si ya existe una editorial con ese nombre, sin importar el estado
        const existing = await query('SELECT * FROM publishers WHERE name = ?', [name]);
        if (existing.length > 0) {
            req.flash('error', 'Ya existe una editorial con ese nombre.');
            return res.redirect('/publishers');
        }
        await query('INSERT INTO publishers (name, state) VALUES (?, 1)', [name]);
        req.flash('success', 'Publisher added successfully!');
        res.redirect('/publishers');
    } catch (error) {
        // console.error('Error adding publisher:', error);
        req.flash('error', 'Failed to add publisher. Please try again.');
        res.redirect('/publishers');
    }
});

// Show edit publisher form
router.get('/edit/:id', async (req, res) => {
    try {
        const { query } = req.db;
        const publishers = await query('SELECT * FROM publishers WHERE id_publisher = ?', [req.params.id]);
        
        if (!publishers || publishers.length === 0) {
            req.flash('error', 'Publisher not found.');
            return res.redirect('/publishers');
        }

        res.render('publishers/edit', { 
            publisher: publishers[0],
            messages: req.flash()
        });
    } catch (error) {
        // console.error('Error fetching publisher:', error);
        req.flash('error', 'Failed to fetch publisher details. Please try again.');
        res.redirect('/publishers');
    }
});

// Update publisher
router.post('/update/:id', async (req, res) => {
    const { name } = req.body;
    
    try {
        const { query } = req.db;
        await query('UPDATE publishers SET name = ? WHERE id_publisher = ?',
            [name, req.params.id]);
        req.flash('success', 'Publisher updated successfully!');
        res.redirect('/publishers');
    } catch (error) {
        // console.error('Error updating publisher:', error);
        req.flash('error', 'Failed to update publisher. Please try again.');
        res.redirect('/publishers');
    }
});

// Soft delete publisher
router.post('/delete/:id', async (req, res) => {
    try {
        const { query } = req.db;
        await query('UPDATE publishers SET state = 0 WHERE id_publisher = ?', [req.params.id]);
        req.flash('success', 'Publisher deleted successfully!');
    } catch (error) {
        // console.error('Error deleting publisher:', error);
        req.flash('error', 'Failed to delete publisher. Please try again.');
    }
    res.redirect('/publishers');
});

module.exports = router;
