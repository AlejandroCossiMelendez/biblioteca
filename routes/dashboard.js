const express = require('express');
const router = express.Router();

// Get all books
router.get('/', async (req, res) => {
    try {
        const { query } = req.db;
        const books = await query(`
            SELECT b.*, 
                   a.name as author_name,
                   c.name as category_name,
                   p.name as publisher_name
            FROM books b
            LEFT JOIN authors a ON b.id_author = a.id_author
            LEFT JOIN categories c ON b.id_category = c.id_category
            LEFT JOIN publishers p ON b.id_publisher = p.id_publisher
            WHERE b.state = 1
            ORDER BY b.name
        `);

        const authors = await query('SELECT id_author, name FROM authors ORDER BY name');
        const categories = await query('SELECT id_category, name FROM categories ORDER BY name');
        const publishers = await query('SELECT id_publisher, name FROM publishers ORDER BY name');

        res.render('books/index', {
            books: books || [],
            authors: authors || [],
            categories: categories || [],
            publishers: publishers || [],
            messages: req.flash()
        });
    } catch (error) {
        // console.error('Error en la ruta GET /books:', error);
        req.flash('error', 'Error al cargar los datos. Por favor, intente nuevamente.');
        res.redirect('/books');
    }
});

// Add new book
router.post('/add', async (req, res) => {
    const { name, id_author, id_category, id_publisher, isbn, year_published, num_pages } = req.body;
    try {
        const { query } = req.db;
        const existing = await query('SELECT * FROM books WHERE name = ?', [name]);
        if (existing.length > 0) {
            req.flash('error', 'Ya existe un libro con ese nombre.');
            return res.redirect('/books');
        }
        await query('INSERT INTO books (name, id_author, id_category, id_publisher, isbn, year_published, num_pages, state) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
            [name, id_author, id_category, id_publisher, isbn, year_published, num_pages]);
        req.flash('success', 'Libro agregado exitosamente');
        res.redirect('/books');
    } catch (error) {
        // console.error('Error adding book:', error);
        req.flash('error', 'Error al agregar el libro. Por favor, intente nuevamente.');
        res.redirect('/books');
    }
});

// Show edit book form
router.get('/edit/:id', async (req, res) => {
    const bookId = req.params.id;
    try {
        const { query } = req.db;
        const book = await query('SELECT * FROM books WHERE id_book = ?', [bookId]);
        const authors = await query('SELECT * FROM authors ORDER BY name');
        const categories = await query('SELECT * FROM categories ORDER BY name');
        const publishers = await query('SELECT * FROM publishers ORDER BY name');

        if (!book || book.length === 0) {
            req.flash('error', 'Libro no encontrado.');
            return res.redirect('/books');
        }

        res.render('books/index', {
            book: book[0],
            authors,
            categories,
            publishers,
            messages: req.flash()
        });
    } catch (error) {
        // console.error('Error fetching book:', error);
        req.flash('error', 'Error al obtener los detalles del libro.');
        res.redirect('/books');
    }
});
// Show edit book form
router.get('/edit/:id', async (req, res) => {
    const bookId = req.params.id;
    try {
        const { query } = req.db;
        const book = await query('SELECT * FROM books WHERE id_book = ?', [bookId]);
        const authors = await query('SELECT * FROM authors ORDER BY name');
        const categories = await query('SELECT * FROM categories ORDER BY name');
        const publishers = await query('SELECT * FROM publishers ORDER BY name');

        if (!book || book.length === 0) {
            req.flash('error', 'Libro no encontrado.');
            return res.redirect('/books');
        }

        res.render('books/index', {
            book: book[0], // Asegúrate de que estás pasando el primer elemento del array
            authors,
            categories,
            publishers,
            messages: req.flash()
        });
    } catch (error) {
        // console.error('Error fetching book:', error);
        req.flash('error', 'Error al obtener los detalles del libro.');
        res.redirect('/books');
    }
});
// Update book
router.post('/update/:id', async (req, res) => {
    const { name, id_author, id_category, id_publisher, isbn, year_published, num_pages } = req.body;
    const { id } = req.params;
    const { query } = req.db;

    try {
        // Validar que el ISBN sea único (excepto el libro actual)
        if (isbn) {
            const [isbnRows] = await query(`
                SELECT * FROM books 
                WHERE isbn = ? AND id_book != ?`,
                [isbn, id]
            );

            // Si se encuentra un ISBN duplicado, detener el proceso
            if (isbnRows && isbnRows.length > 0) {
                // console.log('ISBN duplicado encontrado:', isbnRows); // Mostrar registros duplicados en la consola
                return res.status(400).json({ success: false, message: 'El ISBN ya está registrado en otro libro.' });
            }
        }

        // Actualizar libro
        const result = await query('UPDATE books SET name = ?, id_author = ?, id_category = ?, id_publisher = ?, isbn = ?, year_published = ?, num_pages = ? WHERE id_book = ?',
            [name, id_author, id_category, id_publisher, isbn, year_published, num_pages, id]);

        if (result.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'No se realizaron cambios en el libro.' });
        }

        return res.json({ success: true, message: 'Libro actualizado exitosamente' });

    } catch (error) {
        // console.error('Error updating book:', error);
        return res.status(500).json({ success: false, message: 'Error al actualizar el libro. Por favor, intente nuevamente.' });
    }
});


// Soft delete book
router.post('/delete/:id', async (req, res) => {
    try {
        const { query } = req.db;
        await query('UPDATE books SET state = 0 WHERE id_book = ?', [req.params.id]);
        req.flash('success', 'Libro eliminado exitosamente');
    } catch (error) {
        // console.error('Error deleting book:', error);
        req.flash('error', 'Error al eliminar el libro. Por favor, intente nuevamente.');
    }
    res.redirect('/books');
});

module.exports = router;