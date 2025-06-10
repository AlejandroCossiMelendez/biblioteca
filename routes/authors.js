const express = require('express');
const router = express.Router();
const dbConn  = require('../lib/db');

// Listar autores
router.get('/', function(req, res, next) {
    dbConn.query('SELECT * FROM authors ORDER BY id_author DESC', function(err, rows) {
        if(err) {
            req.flash('error', err);
            res.render('books/authors', { data: [] });
        } else {
            res.render('books/authors', { data: rows });
        }
    });
});

// Mostrar formulario agregar autor
router.get('/add', function(req, res, next) {
    res.render('books/add_author', {
        name: '',
        state: 1
    });
});

// Agregar autor
router.post('/add', function(req, res, next) {
    let name = req.body.name;
    let state = req.body.state;
    let errors = false;

    if(name.length === 0) {
        errors = true;
        req.flash('error', 'Por favor ingresa el nombre del autor');
        res.render('books/add_author', {
            name: name,
            state: state
        });
    }

    if(!errors) {
        var form_data = {
            name: name,
            state: state
        };
        
        dbConn.query('INSERT INTO authors SET ?', form_data, function(err, result) {
            if (err) {
                req.flash('error', err);
                res.render('books/add_author', {
                    name: form_data.name,
                    state: form_data.state
                });
            } else {                
                req.flash('success', 'Autor agregado correctamente');
                res.redirect('/authors');
            }
        });
    }
});

// Mostrar formulario editar autor
router.get('/edit/:id', function(req, res, next) {
    let id = req.params.id;
    dbConn.query('SELECT * FROM authors WHERE id_author = ?', [id], function(err, rows) {
        if(err) throw err;
        
        if (rows.length <= 0) {
            req.flash('error', 'Autor no encontrado con id = ' + id);
            res.redirect('/authors');
        } else {
            res.render('books/edit_author', {
                id: rows[0].id_author,
                name: rows[0].name,
                state: rows[0].state
            });
        }
    });
});

// Actualizar autor
router.post('/update/:id', function(req, res, next) {
    let id = req.params.id;
    let name = req.body.name;
    let state = req.body.state;
    let errors = false;

    if(name.length === 0) {
        errors = true;
        req.flash('error', 'Por favor ingresa el nombre del autor');
        res.render('books/edit_author', {
            id: req.params.id,
            name: name,
            state: state
        });
    }

    if(!errors) {
        var form_data = {
            name: name,
            state: state
        };
        
        dbConn.query('UPDATE authors SET ? WHERE id_author = ?', [form_data, id], function(err, result) {
            if (err) {
                req.flash('error', err);
                res.render('books/edit_author', {
                    id: req.params.id,
                    name: form_data.name,
                    state: form_data.state
                });
            } else {
                req.flash('success', 'Autor actualizado correctamente');
                res.redirect('/authors');
            }
        });
    }
});

// Eliminar autor
router.get('/delete/:id', function(req, res, next) {
    let id = req.params.id;
    dbConn.query('DELETE FROM authors WHERE id_author = ?', [id], function(err, result) {
        if(err) {
            req.flash('error', err);
        } else {
            req.flash('success', 'Autor eliminado correctamente');
        }
        res.redirect('/authors');
    });
});

module.exports = router;