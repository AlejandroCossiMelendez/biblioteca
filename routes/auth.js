const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../lib/db');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated) {
        return next();
    }
    res.redirect('/auth/login');
};

// Middleware to check if user is NOT authenticated
const isNotAuthenticated = (req, res, next) => {
    if (!req.session.isAuthenticated) {
        return next();
    }
    res.redirect('/');
};

// Login page route
router.get('/login', isNotAuthenticated, (req, res) => {
    res.render('auth/login', {
        title: 'Iniciar Sesión'
    });
});

// Login form submission
router.post('/login', isNotAuthenticated, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            req.flash('error', 'Por favor ingrese usuario y contraseña');
            return res.redirect('/auth/login');
        }

        // Get user from database with role information
        const query = `
            SELECT u.*, r.name as role_name 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.username = ? AND u.status = 1`;
        
        db.query(query, [username], async (error, results) => {
            if (error) {
                console.error('Error en la consulta SQL:', error);
                req.flash('error', 'Error al iniciar sesión');
                return res.redirect('/auth/login');
            }

            if (!results || results.length === 0) {
                req.flash('error', 'Usuario no encontrado o inactivo');
                return res.redirect('/auth/login');
            }

            const user = results[0];

            // Comparar contraseña usando bcrypt
            const match = await bcrypt.compare(password, user.password);
            
            if (match) {
                // Login exitoso
                req.session.regenerate((err) => {
                    if (err) {
                        console.error('Error regenerating session:', err);
                        req.flash('error', 'Error al iniciar sesión');
                        return res.redirect('/auth/login');
                    }

                    req.session.isAuthenticated = true;
                    req.session.user = {
                        id: user.id,
                        username: user.username,
                        full_name: user.full_name,
                        role: user.role_name,
                        email: user.email
                    };
                    
                    // Save session before redirect
                    req.session.save((err) => {
                        if (err) {
                            console.error('Error saving session:', err);
                            req.flash('error', 'Error al iniciar sesión');
                            return res.redirect('/auth/login');
                        }
                        return res.redirect('/');
                    });
                });
            } else {
                req.flash('error', 'Contraseña incorrecta');
                return res.redirect('/auth/login');
            }
        });
    } catch (error) {
        console.error('Error general en login:', error);
        req.flash('error', 'Error al iniciar sesión');
        return res.redirect('/auth/login');
    }
});

// Logout route
router.get('/logout', (req, res) => {
    if (!req.session) {
        return res.redirect('/auth/login');
    }

    // Clear all session data
    req.session.isAuthenticated = false;
    req.session.user = null;
    
    req.session.regenerate((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
            }
            // Clear the session cookie
            res.clearCookie('connect.sid');
            // Redirect to login page
            return res.redirect('/auth/login');
        });
    });
});

// Register page route
router.get('/register', isNotAuthenticated, (req, res) => {
    res.render('auth/register', {
        title: 'Registro'
    });
});

// Register form submission
router.post('/register', isNotAuthenticated, async (req, res) => {
    try {
        const { full_name, username, email, password, confirm_password } = req.body;

        // Validate input
        if (!full_name || !username || !email || !password || !confirm_password) {
            req.flash('error', 'Por favor complete todos los campos');
            return res.redirect('/auth/register');
        }

        if (password !== confirm_password) {
            req.flash('error', 'Las contraseñas no coinciden');
            return res.redirect('/auth/register');
        }

        // Check if username or email already exists
        const checkQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
        db.query(checkQuery, [username, email], async (error, results) => {
            if (error) {
                console.error('Error en la consulta SQL:', error);
                req.flash('error', 'Error al verificar usuario');
                return res.redirect('/auth/register');
            }

            if (results && results.length > 0) {
                req.flash('error', 'El usuario o correo electrónico ya está registrado');
                return res.redirect('/auth/register');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Get user role id
            db.query('SELECT id FROM roles WHERE name = ?', ['user'], (error, roleResults) => {
                if (error || !roleResults || roleResults.length === 0) {
                    console.error('Error al obtener rol de usuario:', error);
                    req.flash('error', 'Error al crear la cuenta');
                    return res.redirect('/auth/register');
                }

                const roleId = roleResults[0].id;

                // Insert new user
                const insertQuery = 'INSERT INTO users (full_name, username, email, password, role_id, status) VALUES (?, ?, ?, ?, ?, ?)';
                db.query(insertQuery, [full_name, username, email, hashedPassword, roleId, 1], (error, results) => {
                    if (error) {
                        console.error('Error al crear usuario:', error);
                        req.flash('error', 'Error al crear la cuenta');
                        return res.redirect('/auth/register');
                    }

                    req.flash('success', 'Cuenta creada exitosamente. Por favor inicie sesión.');
                    res.redirect('/auth/login');
                });
            });
        });
    } catch (error) {
        console.error('Error general en registro:', error);
        req.flash('error', 'Error al crear la cuenta');
        res.redirect('/auth/register');
    }
});

module.exports = router; 