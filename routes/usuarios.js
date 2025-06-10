const express = require('express');
const router = express.Router();
const dbConn = require('../lib/db');
const { isAuthenticated, checkRole } = require('../lib/auth');
const bcrypt = require('bcrypt');

// Listar usuarios (solo admin)
router.get('/', isAuthenticated, checkRole(['admin']), (req, res) => {
    dbConn.query(`
        SELECT u.*, r.name as role_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE r.name != 'admin'
        ORDER BY u.id DESC`, (err, rows) => {
        if(err) {
            console.error('Error al obtener usuarios:', err);
            req.flash('error', 'Error al obtener la lista de usuarios');
            return res.render('books/usuarios', { 
                data: [], 
                messages: req.flash(),
                currentUser: req.session.user
            });
        }
        
        res.render('books/usuarios', { 
            data: rows, 
            messages: req.flash(),
            currentUser: req.session.user
        });
    });
});

// Formulario para agregar usuario (solo admin)
router.get('/add', isAuthenticated, checkRole(['admin']), (req, res) => {
    // Obtener roles disponibles excluyendo el rol admin
    dbConn.query('SELECT * FROM roles WHERE name != "admin" ORDER BY name', (err, roles) => {
        if(err) {
            console.error('Error al obtener roles:', err);
            req.flash('error', 'Error al cargar el formulario');
            return res.redirect('/usuarios');
        }

        res.render('books/usuarios/add', {
            roles,
            messages: req.flash(),
            user: req.session.user
        });
    });
});

// Editar usuario (solo admin)
router.get('/edit/:id', isAuthenticated, checkRole(['admin']), (req, res) => {
    const userId = req.params.id;
    
    // Obtener información del usuario
    dbConn.query(`
        SELECT u.*, r.name as role_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ? AND r.name != 'admin'`, [userId], (err, rows) => {
        if(err) {
            console.error('Error al obtener usuario:', err);
            req.flash('error', 'Error al cargar los datos del usuario');
            return res.redirect('/usuarios');
        }

        if (rows.length === 0) {
            req.flash('error', 'Usuario no encontrado o no se puede editar');
            return res.redirect('/usuarios');
        }

        // Obtener roles para el formulario, excluyendo el rol admin
        dbConn.query('SELECT * FROM roles WHERE name != "admin" ORDER BY name', (err, roles) => {
            if(err) {
                console.error('Error al obtener roles:', err);
                req.flash('error', 'Error al cargar los roles');
                return res.redirect('/usuarios');
            }

            res.render('books/usuarios/edit', {
                user: rows[0],
                roles,
                messages: req.flash(),
                currentUser: req.session.user
            });
        });
    });
});

// Eliminar usuario (solo admin)
router.get('/delete/:id', isAuthenticated, checkRole(['admin']), (req, res) => {
    const userId = req.params.id;

    // Verificar que no sea el usuario administrador por defecto
    if (userId === '1') {
        req.flash('error', 'No se puede eliminar el usuario administrador por defecto');
        return res.redirect('/usuarios');
    }

    // Verificar que no sea el usuario actual
    if (userId === req.session.user.id.toString()) {
        req.flash('error', 'No puedes eliminar tu propio usuario');
        return res.redirect('/usuarios');
    }

    dbConn.query('UPDATE users SET status = 0 WHERE id = ?', [userId], (err, result) => {
        if (err) {
            console.error('Error al eliminar usuario:', err);
            req.flash('error', 'Error al eliminar el usuario');
        } else {
            req.flash('success', 'Usuario eliminado exitosamente');
        }
        res.redirect('/usuarios');
    });
});
// Crear nuevo usuario (POST) - Versión compatible con mysql estándar
router.post('/add', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const { username, password, full_name, email, role_id } = req.body;

    // Configurar el tipo de contenido como JSON
    res.setHeader('Content-Type', 'application/json');
    console.log('Body recibido:', req.body);

    try {
        // Validación básica de campos
        if (!username || !password || !full_name || !email || !role_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }

        // Validar formato de email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Por favor ingrese un email válido'
            });
        }

        // Convertir role_id a número (por si viene como string)
        const roleId = parseInt(role_id);

        // Verificar que el rol no sea admin (usando callbacks)
        const roles = await new Promise((resolve, reject) => {
            dbConn.query('SELECT name FROM roles WHERE id = ?', [roleId], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        if (!roles.length || roles[0].name === 'admin') {
            return res.status(400).json({ 
                success: false, 
                message: 'Rol no válido' 
            });
        }

        // Verificar si el usuario ya existe (usando callbacks)
        const existingUsers = await new Promise((resolve, reject) => {
            dbConn.query(
                'SELECT id FROM users WHERE username = ? OR email = ?', 
                [username, email],
                (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                }
            );
        });
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'El nombre de usuario o email ya está en uso' 
            });
        }

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear el nuevo usuario
        const userData = {
            username,
            password: hashedPassword,
            full_name,
            email,
            role_id: roleId, // Usamos la versión convertida a número
            status: 1,
            created_at: new Date(),
            updated_at: new Date()
        };

        // Insertar usuario (usando callbacks)
        const result = await new Promise((resolve, reject) => {
            dbConn.query('INSERT INTO users SET ?', userData, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
        
        return res.json({ 
            success: true, 
            message: 'Usuario creado exitosamente',
            data: {
                userId: result.insertId,
                username: userData.username,
                email: userData.email
            }
        });

    } catch (error) {
        console.error('Error al crear usuario:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al crear el usuario',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});// Actualizar usuario (POST JSON)
router.post('/update/:id', isAuthenticated, checkRole(['admin']), async (req, res) => {
    const userId = req.params.id;
    const { username, full_name, email, role_id, status, password } = req.body;

    res.setHeader('Content-Type', 'application/json');
    console.log('Body recibido:', req.body);

    try {
        // Validar campos requeridos
        if (!username || !full_name || !email || !role_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }

        // Validar formato de email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Por favor ingrese un email válido'
            });
        }

        // Convertir role_id a número (por si viene como string)
        const roleId = parseInt(role_id);

        // Verificar que el rol no sea admin
        const roles = await new Promise((resolve, reject) => {
            dbConn.query('SELECT name FROM roles WHERE id = ?', [roleId], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        if (!roles.length || roles[0].name === 'admin') {
            return res.status(400).json({ 
                success: false, 
                message: 'Rol no válido' 
            });
        }

        // Verificar si el username o email ya están en uso (excepto por este usuario)
        const existingUsers = await new Promise((resolve, reject) => {
            dbConn.query(
                'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?', 
                [username, email, userId],
                (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                }
            );
        });

        if (existingUsers.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'El nombre de usuario o email ya está en uso' 
            });
        }

        // Armar datos para actualizar
        const userData = {
            username,
            full_name,
            email,
            role_id: roleId,
            status: status || 1,
            updated_at: new Date()
        };

        // Si se proporciona una nueva contraseña, encriptarla
        if (password) {
            userData.password = await bcrypt.hash(password, 10);
        }

        // Actualizar el usuario
        const result = await new Promise((resolve, reject) => {
            dbConn.query('UPDATE users SET ? WHERE id = ?', [userData, userId], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        return res.json({ 
            success: true,
            message: 'Usuario actualizado exitosamente',
            data: {
                userId: userId,
                username: userData.username,
                email: userData.email
            }
        });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al actualizar el usuario',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


module.exports = router; 