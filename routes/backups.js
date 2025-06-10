const express = require('express');
const router = express.Router();

// Obtener datos de backups
router.get('/', async (req, res) => {
    try {
        const { query } = req.db; // Obtener la función de consulta de la conexión a la base de datos

        // Consultar autores, libros, categorías y editores con estado 0
        const authors = await query('SELECT * FROM authors WHERE state = 0');
        const books = await query(`
            SELECT 
                books.id_book,
                books.name,
                authors.name AS author_name,
                categories.name AS category_name,
                publishers.name AS publisher_name,
                books.isbn,
                books.year_published,
                books.num_pages,
                books.created_at,
                books.updated_at,
                books.state
            FROM books
            LEFT JOIN authors ON books.id_author = authors.id_author
            LEFT JOIN categories ON books.id_category = categories.id_category
            LEFT JOIN publishers ON books.id_publisher = publishers.id_publisher
            WHERE books.state = 0
        `);
        
        const categories = await query('SELECT * FROM categories WHERE state = 0');
        const publishers = await query('SELECT * FROM publishers WHERE state = 0');
        
        // Renderizar la vista de backups con los datos obtenidos
        res.render('backups/backups', { authors, books, categories, publishers, messages: req.flash() });
    } catch (error) {
        // console.error('Error al obtener los datos de backups:', error);
        req.flash('error', 'Error al cargar los datos de backups. Por favor, intente nuevamente.');
        res.render('backups/backups', { authors: [], books: [], categories: [], publishers: [], messages: req.flash() }); // Renderizar la vista con datos vacíos
    }
});

// Ruta para restaurar un libro
router.post('/restore/books/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID del libro

    try {
        const { query } = req.db; // Obtener la función de consulta de la conexión a la base de datos

        // Actualizar el estado del libro a 1 (restaurar)
        await query(`UPDATE books SET state = 1 WHERE id_book = ?`, [id]);
        res.json({ message: 'Libro restaurado exitosamente.' }); // Responder con un mensaje JSON
    } catch (error) {
        // console.error(`Error al restaurar el libro:`, error);
        res.status(500).json({ message: 'Error al restaurar el libro. Por favor, intente nuevamente.' });
    }
});

// Ruta para restaurar un autor
router.post('/restore/authors/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID del autor

    try {
        const { query } = req.db; // Obtener la función de consulta de la conexión a la base de datos

        // Actualizar el estado del autor a 1 (restaurar)
        await query(`UPDATE authors SET state = 1 WHERE id_author = ?`, [id]);
        res.json({ message: 'Autor restaurado exitosamente.' }); // Responder con un mensaje JSON
    } catch (error) {
        // console.error(`Error al restaurar el autor:`, error);
        res.status(500).json({ message: 'Error al restaurar el autor. Por favor, intente nuevamente.' });
    }
});

// Ruta para restaurar una categoría
router.post('/restore/categories/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID de la categoría

    try {
        const { query } = req.db; // Obtener la función de consulta de la conexión a la base de datos

        // Actualizar el estado de la categoría a 1 (restaurar)
        await query(`UPDATE categories SET state = 1 WHERE id_category = ?`, [id]);
        res.json({ message: 'Categoría restaurada exitosamente.' }); // Responder con un mensaje JSON
    } catch (error) {
        // console.error(`Error al restaurar la categoría:`, error);
        res.status(500).json({ message: 'Error al restaurar la categoría. Por favor, intente nuevamente.' });
    }
});

// Ruta para restaurar un editor
router.post('/restore/publishers/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID del editor

    try {
        const { query } = req.db; // Obtener la función de consulta de la conexión a la base de datos

        // Actualizar el estado del editor a 1 (restaurar)
        await query(`UPDATE publishers SET state = 1 WHERE id_publisher = ?`, [id]);
        res.json({ message: 'Editorial restaurada exitosamente.' }); // Responder con un mensaje JSON
    } catch (error) {
        // console.error(`Error al restaurar la editorial:`, error);
        res.status(500).json({ message: 'Error al restaurar la editorial. Por favor, intente nuevamente.' });
    }
});

module.exports = router;
