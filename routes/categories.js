const express = require('express');
const router = express.Router();
const dbConn  = require('../lib/db');

// Listar categorías
router.get('/', function(req, res, next) {
    dbConn.query('SELECT * FROM categories ORDER BY id_category DESC', function(err, rows) {
        if(err) {
            req.flash('error', err);
            res.render('books/categories', { data: [] });
        } else {
            res.render('books/categories', { data: rows });
        }
    });
});

// Mostrar formulario agregar categoría
router.get('/add', function(req, res, next) {
    res.render('books/add_category', {
        name: '',
        description: '',
        state: 1
    });
});

// Agregar categoría
router.post('/add', function(req, res, next) {
    let name = req.body.name;
    let description = req.body.description || '';
    let state = req.body.state;
    let errors = false;

    if(name.length === 0) {
        errors = true;
        req.flash('error', 'Por favor ingresa el nombre de la categoría');
        res.render('books/add_category', {
            name: name,
            description: description,
            state: state
        });
    }

    if(!errors) {
        var form_data = {
            name: name,
            description: description,
            state: state
        };
        
        dbConn.query('INSERT INTO categories SET ?', form_data, function(err, result) {
            if (err) {
                req.flash('error', err);
                res.render('books/add_category', {
                    name: form_data.name,
                    description: form_data.description,
                    state: form_data.state
                });
            } else {
                req.flash('success', 'Categoría agregada correctamente');
                res.redirect('/categories');
            }
        });
    }
});

// Mostrar formulario editar categoría
router.get('/edit/:id', function(req, res, next) {
    let id = req.params.id;
    dbConn.query('SELECT * FROM categories WHERE id_category = ?', [id], function(err, rows) {
        if(err) throw err;
        
        if (rows.length <= 0) {
            req.flash('error', 'Categoría no encontrada con id = ' + id);
            res.redirect('/categories');
        } else {
            res.render('books/edit_category', {
                id: rows[0].id_category,
                name: rows[0].name,
                description: rows[0].description || '',
                state: rows[0].state
            });
        }
    });
});

// Actualizar categoría
router.post('/update/:id', function(req, res, next) {
    let id = req.params.id;
    let name = req.body.name;
    let description = req.body.description || '';
    let state = req.body.state;
    let errors = false;

    if(name.length === 0) {
        errors = true;
        req.flash('error', 'Por favor ingresa el nombre de la categoría');
        res.render('books/edit_category', {
            id: id,
            name: name,
            description: description,
            state: state
        });
    }

    if(!errors) {
        var form_data = {
            name: name,
            description: description,
            state: state
        };
        
        dbConn.query('UPDATE categories SET ? WHERE id_category = ?', [form_data, id], function(err, result) {
            if (err) {
                req.flash('error', err);
                res.render('books/edit_category', {
                    id: id,
                    name: name,
                    description: description,
                    state: state
                });
            } else {
                req.flash('success', 'Categoría actualizada correctamente');
                res.redirect('/categories');
            }
        });
    }
});

// Eliminar categoría
router.get('/delete/:id', function(req, res, next) {
    let id = req.params.id;
    dbConn.query('DELETE FROM categories WHERE id_category = ?', [id], function(err, result) {
        if(err) {
            req.flash('error', err);
        } else {
            req.flash('success', 'Categoría eliminada correctamente');
        }
        res.redirect('/categories');
    });
});

module.exports = router;
