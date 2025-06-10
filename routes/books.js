const express = require('express');
const router = express.Router();
const dbConn = require('../lib/db');

// List all books (showing active ones by default)
router.get('/', function(req, res, next) {
    const query = `
        SELECT 
            books.*,
            authors.name as author_name,
            categories.name as category_name,
            editorials.name as editorial_name,
            books.available as available_copies,
            (SELECT COUNT(*) FROM loans WHERE book_id = books.id_book AND status = 'active') as borrowed_copies
        FROM books 
        LEFT JOIN authors ON books.id_author = authors.id_author 
        LEFT JOIN categories ON books.id_category = categories.id_category 
        LEFT JOIN editorials ON books.id_editorial = editorials.id_editorial 
        WHERE books.state = 1 
        AND books.is_deleted = 0 
        ORDER BY books.id_book DESC`;

    dbConn.query(query, function(err, rows) {
        if(err) {
            console.error('Error en la consulta:', err);
            req.flash('error', err.message);
            res.render('books/index', { data: [] });
        } else {
            // Calcular el total de ejemplares para cada libro
            rows.forEach(book => {
                console.log('Libro antes de procesar:', {
                    id: book.id_book,
                    title: book.title,
                    available: book.available,
                    available_copies: book.available_copies,
                    borrowed: book.borrowed_copies
                });
                
                book.total_copies = book.available_copies + (book.borrowed_copies || 0);
                
                console.log('Libro después de procesar:', {
                    id: book.id_book,
                    title: book.title,
                    available_copies: book.available_copies,
                    borrowed_copies: book.borrowed_copies,
                    total_copies: book.total_copies
                });
            });
            
            res.render('books/index', { 
                data: rows,
                user: req.session.user
            });
        }
    });
});

// Display add book form
router.get('/add', function(req, res, next) {
    const queryAuthors = 'SELECT * FROM authors WHERE state = 1 ORDER BY id_author DESC';
    const queryCategories = 'SELECT * FROM categories WHERE state = 1 ORDER BY id_category DESC';
    const queryEditorials = 'SELECT * FROM editorials WHERE state = 1 ORDER BY id_editorial DESC';

    dbConn.query(queryAuthors, function(err, authors) {
        if (err) {
            req.flash('error', 'Error al cargar autores');
            return res.render('books/add', {
                authors: [],
                categories: [],
                editorials: [],
                title: '',
                isbn: '',
                year: '',
                currentYear: new Date().getFullYear(),
                messages: req.flash()
            });
        }

        dbConn.query(queryCategories, function(err, categories) {
            if (err) {
                req.flash('error', 'Error al cargar categorías');
                return res.render('books/add', {
                    authors,
                    categories: [],
                    editorials: [],
                    title: '',
                    isbn: '',
                    year: '',
                    currentYear: new Date().getFullYear(),
                    messages: req.flash()
                });
            }

            dbConn.query(queryEditorials, function(err, editorials) {
                if (err) {
                    req.flash('error', 'Error al cargar editoriales');
                    return res.render('books/add', {
                        authors,
                        categories,
                        editorials: [],
                        title: '',
                        isbn: '',
                        year: '',
                        currentYear: new Date().getFullYear(),
                        messages: req.flash()
                    });
                }

                // Verificar si hay elementos disponibles
                if (authors.length === 0) {
                    req.flash('error', 'No hay autores activos disponibles');
                    return res.redirect('/books');
                }
                if (categories.length === 0) {
                    req.flash('error', 'No hay categorías activas disponibles');
                    return res.redirect('/books');
                }
                if (editorials.length === 0) {
                    req.flash('error', 'No hay editoriales activas disponibles');
                    return res.redirect('/books');
                }

                res.render('books/add', {
                    authors,
                    categories,
                    editorials,
                    title: '',
                    isbn: '',
                    year: '',
                    currentYear: new Date().getFullYear(),
                    messages: req.flash()
                });
            });
        });
    });
});

// Add new book
router.post('/add', function(req, res, next) {
    let title = req.body.title;
    let isbn = req.body.isbn;
    let year = req.body.year;
    let id_author = req.body.author;
    let id_category = req.body.category;
    let id_editorial = req.body.editorial;
    let available = req.body.available || 1;

    let errors = false;

    if(!title || !isbn || !year || !id_author || !id_category || !id_editorial) {
        errors = true;
        req.flash('error', 'Por favor ingrese todos los campos requeridos');
        res.redirect('/books/add');
        return;
    }

    // Verificar que el autor, categoría y editorial estén activos
    const checkActiveQuery = `
        SELECT 
            (SELECT state FROM authors WHERE id_author = ?) as author_state,
            (SELECT state FROM categories WHERE id_category = ?) as category_state,
            (SELECT state FROM editorials WHERE id_editorial = ?) as editorial_state`;

    dbConn.query(checkActiveQuery, [id_author, id_category, id_editorial], function(err, result) {
        if (err) {
            req.flash('error', 'Error al verificar estados');
            return res.redirect('/books/add');
        }

        if (!result[0].author_state) {
            req.flash('error', 'El autor seleccionado no está activo');
            return res.redirect('/books/add');
        }
        if (!result[0].category_state) {
            req.flash('error', 'La categoría seleccionada no está activa');
            return res.redirect('/books/add');
        }
        if (!result[0].editorial_state) {
            req.flash('error', 'La editorial seleccionada no está activa');
            return res.redirect('/books/add');
        }

        let form_data = {
            title: title,
            isbn: isbn,
            year: year,
            id_author: id_author,
            id_category: id_category,
            id_editorial: id_editorial,
            available: available,
            state: 1
        };

        dbConn.query('INSERT INTO books SET ?', form_data, function(err, result) {
            if (err) {
                req.flash('error', err.message);
                res.redirect('/books/add');
            } else {
                req.flash('success', 'Libro agregado correctamente');
                res.redirect('/books');
            }
        });
    });
});

// Display edit book form
router.get('/edit/:id', function(req, res, next) {
    let id = req.params.id;

    // Mejorada la consulta para incluir los datos relacionados
    const bookQuery = `
        SELECT b.*, 
               a.name as author_name, 
               c.name as category_name, 
               e.name as editorial_name
        FROM books b
        LEFT JOIN authors a ON b.id_author = a.id_author
        LEFT JOIN categories c ON b.id_category = c.id_category
        LEFT JOIN editorials e ON b.id_editorial = e.id_editorial
        WHERE b.id_book = ?`;

    dbConn.query(bookQuery, [id], function(err, rows) {
        if(err) {
            req.flash('error', err.message);
            res.redirect('/books');
        } else if (!rows || rows.length === 0) {
            req.flash('error', 'Libro no encontrado');
            res.redirect('/books');
        } else {
            const queryAuthors = 'SELECT * FROM authors WHERE state = 1 ORDER BY name ASC';
            const queryCategories = 'SELECT * FROM categories WHERE state = 1 ORDER BY name ASC';
            const queryEditorials = 'SELECT * FROM editorials WHERE state = 1 ORDER BY name ASC';

            dbConn.query(queryAuthors, function(err, authors) {
                if (err) {
                    req.flash('error', 'Error al cargar autores');
                    return res.redirect('/books');
                }

                dbConn.query(queryCategories, function(err, categories) {
                    if (err) {
                        req.flash('error', 'Error al cargar categorías');
                        return res.redirect('/books');
                    }

                    dbConn.query(queryEditorials, function(err, editorials) {
                        if (err) {
                            req.flash('error', 'Error al cargar editoriales');
                            return res.redirect('/books');
                        }

                        res.render('books/edit', {
                            id: rows[0].id_book,
                            title: rows[0].title,
                            isbn: rows[0].isbn,
                            year: rows[0].year,
                            available: rows[0].available,
                            authors: authors,
                            categories: categories,
                            editorials: editorials,
                            currentAuthor: rows[0].id_author,
                            currentCategory: rows[0].id_category,
                            currentEditorial: rows[0].id_editorial,
                            currentYear: new Date().getFullYear(),
                            state: rows[0].state,
                            // Agregamos los nombres para mostrar en la interfaz
                            author_name: rows[0].author_name,
                            category_name: rows[0].category_name,
                            editorial_name: rows[0].editorial_name,
                            messages: req.flash()
                        });
                    });
                });
            });
        }
    });
});

// Update book
router.post('/update/:id', function(req, res, next) {
    let id = req.params.id;
    let title = req.body.title;
    let isbn = req.body.isbn;
    let year = req.body.year;
    let id_author = req.body.author;
    let id_category = req.body.category;
    let id_editorial = req.body.editorial;
    let state = req.body.state;
    let available = req.body.available;

    let errors = false;

    if(!title || !isbn || !year || !id_author || !id_category || !id_editorial) {
        errors = true;
        req.flash('error', 'Por favor ingrese todos los campos requeridos');
        res.redirect('/books/edit/' + id);
        return;
    }

    // Verificar que el autor, categoría y editorial estén activos
    const checkActiveQuery = `
        SELECT 
            (SELECT state FROM authors WHERE id_author = ?) as author_state,
            (SELECT state FROM categories WHERE id_category = ?) as category_state,
            (SELECT state FROM editorials WHERE id_editorial = ?) as editorial_state`;

    dbConn.query(checkActiveQuery, [id_author, id_category, id_editorial], function(err, result) {
        if (err) {
            req.flash('error', 'Error al verificar estados');
            return res.redirect('/books/edit/' + id);
        }

        if (!result[0].author_state) {
            req.flash('error', 'El autor seleccionado no está activo');
            return res.redirect('/books/edit/' + id);
        }
        if (!result[0].category_state) {
            req.flash('error', 'La categoría seleccionada no está activa');
            return res.redirect('/books/edit/' + id);
        }
        if (!result[0].editorial_state) {
            req.flash('error', 'La editorial seleccionada no está activa');
            return res.redirect('/books/edit/' + id);
        }

        let form_data = {
            title: title,
            isbn: isbn,
            year: year,
            id_author: id_author,
            id_category: id_category,
            id_editorial: id_editorial,
            available: available,
            state: state || 1
        };

        dbConn.query('UPDATE books SET ? WHERE id_book = ?', [form_data, id], function(err, result) {
            if (err) {
                req.flash('error', err.message);
                res.redirect('/books/edit/' + id);
            } else {
                req.flash('success', 'Libro actualizado correctamente');
                res.redirect('/books');
            }
        });
    });
});

// Move book to trash (soft delete)
router.get('/delete/:id', function(req, res, next) {
    let id = req.params.id;
    
    console.log('Moviendo libro a papelera, ID:', id);

    // Primero verificamos si el libro existe y su estado actual
    dbConn.query('SELECT state, title FROM books WHERE id_book = ?', [id], function(err, bookResult) {
        if (err) {
            console.error('Error al verificar libro:', err);
            req.flash('error', 'Error al verificar el libro');
            return res.redirect('/books');
        }

        if (!bookResult || bookResult.length === 0) {
            console.error('Libro no encontrado:', id);
            req.flash('error', 'Libro no encontrado');
            return res.redirect('/books');
        }

        // Verificamos préstamos activos
        dbConn.query('SELECT COUNT(*) as active_loans FROM loans WHERE book_id = ? AND status = "active"', [id], function(err, loanResult) {
            if (err) {
                console.error('Error al verificar préstamos:', err);
                req.flash('error', 'Error al verificar préstamos activos');
                return res.redirect('/books');
            }

            if (loanResult[0].active_loans > 0) {
                console.log('Libro tiene préstamos activos:', loanResult[0].active_loans);
                req.flash('error', 'No se puede eliminar el libro porque tiene préstamos activos');
                return res.redirect('/books');
            }

            // Si no hay préstamos activos, procedemos con la eliminación lógica
            const updateData = {
                state: 0,
                deleted_at: new Date()
            };

            console.log('Actualizando libro con datos:', updateData);

            dbConn.query('UPDATE books SET ? WHERE id_book = ?', [updateData, id], function(err, updateResult) {
                if (err) {
                    console.error('Error al actualizar libro:', err);
                    req.flash('error', 'Error al mover el libro a la papelera');
                } else {
                    console.log('Libro movido a papelera:', updateResult);
                    req.flash('success', 'Libro "' + bookResult[0].title + '" movido a la papelera correctamente');
                }
                res.redirect('/books');
            });
        });
    });
});

// Restore book from trash
router.get('/restore/:id', function(req, res, next) {
    let id = req.params.id;
    
    console.log('Restaurando libro, ID:', id);

    const updateData = {
        state: 1,
        deleted_at: null
    };
    
    dbConn.query('UPDATE books SET ? WHERE id_book = ?', [updateData, id], function(err, result) {
        if (err) {
            console.error('Error al restaurar libro:', err);
            req.flash('error', 'Error al restaurar el libro');
        } else {
            console.log('Libro restaurado exitosamente');
            req.flash('success', 'Libro restaurado correctamente');
        }
        res.redirect('/books/inactive');
    });
});

// View books in trash
router.get('/inactive', function(req, res, next) {
    console.log('Accediendo a la vista de libros eliminados');

    // Primero, veamos cuántos libros eliminados hay en total
    dbConn.query('SELECT COUNT(*) as total FROM books WHERE state = 0', function(err, countResult) {
        if(err) {
            console.error('Error al contar libros eliminados:', err);
        } else {
            console.log('Total de libros con state = 0:', countResult[0].total);
        }
    });

    const query = `
        SELECT 
            b.id_book,
            b.title,
            b.isbn,
            b.year,
            b.available,
            b.state,
            b.deleted_at,
            a.name as author_name,
            c.name as category_name,
            e.name as editorial_name,
            (SELECT COUNT(*) FROM loans WHERE book_id = b.id_book AND status = 'active') as active_loans
        FROM books b
        LEFT JOIN authors a ON b.id_author = a.id_author
        LEFT JOIN categories c ON b.id_category = c.id_category
        LEFT JOIN editorials e ON b.id_editorial = e.id_editorial
        WHERE b.state = 0
        ORDER BY COALESCE(b.deleted_at, '1900-01-01') DESC, b.id_book DESC`;

    console.log('Ejecutando consulta:', query);

    dbConn.query(query, function(err, rows) {
        if(err) {
            console.error('Error al obtener libros eliminados:', err);
            req.flash('error', 'Error al obtener los libros eliminados: ' + err.message);
            res.render('books/deleted', { 
                data: [],
                user: req.session.user
            });
        } else {
            console.log('Libros eliminados encontrados:', rows.length);
            if(rows.length > 0) {
                console.log('Muestra del primer libro encontrado:', {
                    id: rows[0].id_book,
                    titulo: rows[0].title,
                    estado: rows[0].state,
                    eliminado: rows[0].deleted_at
                });
            } else {
                console.log('No se encontraron libros eliminados');
            }
            
            res.render('books/deleted', { 
                data: rows,
                user: req.session.user
            });
        }
    });
});

module.exports = router;
