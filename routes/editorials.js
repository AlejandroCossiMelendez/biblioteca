var express = require('express');
var router = express.Router();
var dbConn  = require('../lib/db');

// Listar editoriales
router.get('/', function(req, res, next) {
    dbConn.query('SELECT * FROM editorials ORDER BY id_editorial desc', function(err, rows) {
        if(err) {
            req.flash('error', err);
            res.render('books/editorials', {data: ''});
        } else {
            res.render('books/editorials', {data: rows});
        }
    });
});

// Mostrar formulario agregar editorial
router.get('/add', function(req, res, next) {
    res.render('books/add_editorial', { 
        name: '',
        description: '',
        state: '1'  // Activo por defecto
    });
});

// Agregar editorial
router.post('/add', function(req, res, next) {
    let name = req.body.name;
    let description = req.body.description || '';
    let state = req.body.state || '1';
    let errors = false;

    if(name.length === 0) {
        errors = true;
        req.flash('error', 'Por favor ingresa el nombre de la editorial');
        res.render('books/add_editorial', { 
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
        dbConn.query('INSERT INTO editorials SET ?', form_data, function(err, result) {
            if(err) {
                req.flash('error', err);
                res.render('books/add_editorial', { 
                    name: name,
                    description: description,
                    state: state
                });
            } else {
                req.flash('success', 'Editorial agregada correctamente');
                res.redirect('/editorials');
            }
        });
    }
});

// Mostrar formulario editar editorial
router.get('/edit/:id', function(req, res, next) {
    let id = req.params.id;
    dbConn.query('SELECT * FROM editorials WHERE id_editorial = ?', [id], function(err, rows) {
        if(err) throw err;
        if(rows.length <= 0) {
            req.flash('error', 'Editorial no encontrada con id = ' + id);
            res.redirect('/editorials');
        } else {
            // CORRECCIÓN: enviar objeto editorial para que la vista lo reciba correctamente
            res.render('books/edit_editorial', { 
                editorial: {
                    id_editorial: rows[0].id_editorial,
                    name: rows[0].name,
                    description: rows[0].description || '',
                    state: rows[0].state != null ? rows[0].state : 1
                }
            });
        }
    });
});

// Actualizar editorial
router.post('/update/:id', function(req, res, next) {
    let id = req.params.id;
    let name = req.body.name;
    let description = req.body.description || '';
    let state = req.body.state || '1';
    let errors = false;

    if(name.length === 0) {
        errors = true;
        req.flash('error', 'Por favor ingresa el nombre de la editorial');
        // CORRECCIÓN: enviar objeto editorial para que la vista lo reciba correctamente
        res.render('books/edit_editorial', { 
            editorial: {
                id_editorial: id,
                name: name,
                description: description,
                state: state
            }
        });
    }

    if(!errors) {
        var form_data = { 
            name: name,
            description: description,
            state: state
        };
        dbConn.query('UPDATE editorials SET ? WHERE id_editorial = ?', [form_data, id], function(err, result) {
            if(err) {
                req.flash('error', err);
                // CORRECCIÓN: enviar objeto editorial para que la vista lo reciba correctamente
                res.render('books/edit_editorial', { 
                    editorial: {
                        id_editorial: id,
                        name: name,
                        description: description,
                        state: state
                    }
                });
            } else {
                req.flash('success', 'Editorial actualizada correctamente');
                res.redirect('/editorials');
            }
        });
    }
});

// Eliminar editorial
router.get('/delete/:id', function(req, res, next) {
    let id = req.params.id;
    dbConn.query('DELETE FROM editorials WHERE id_editorial = ?', [id], function(err, result) {
        if(err) {
            req.flash('error', err);
            res.redirect('/editorials');
        } else {
            req.flash('success', 'Editorial eliminada correctamente');
            res.redirect('/editorials');
        }
    });
});

module.exports = router;
