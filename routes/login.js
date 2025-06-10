var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');

/* GET página de inicio. */
router.get('/', function(req, res, next) {
  if (req.session.user) {
    return res.redirect('/dashboard'); // Redirect to dashboard if already logged in
  }
  res.render('login/index', { title: 'Sistema de Gestión de Libros - CRUD con Node.js, Express y MySQL' });
});

/* POST para manejar el login */
router.post('/auth/login', async function(req, res, next) {
  const { email, password } = req.body;

  try {
    const { query } = req.db; // Assuming you have a database connection in req.db
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.render('login/index', { title: 'Sistema de Gestión de Libros', error: 'Credenciales incorrectas' });
    }

    const user = users[0];

    // Compare the password with the hashed version stored in the database
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.user = { email: user.email, role: user.role }; // Store user info in session
      return res.redirect('/dashboard'); // Redirect to dashboard
    } else {
      return res.render('login/index', { title: 'Sistema de Gestión de Libros', error: 'Credenciales incorrectas' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    return res.render('login/index', { title: 'Sistema de Gestión de Libros', error: 'Error en el servidor. Inténtalo de nuevo.' });
  }
});

/* POST para manejar el registro */
router.post('/auth/register', async function(req, res, next) {
  const { firstName, lastName, email, password } = req.body;

  try {
    const { query } = req.db;

    // Check if the email already exists
    const existingUser = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.render('login/index', { title: 'Sistema de Gestión de Libros', error: 'El correo electrónico ya está en uso.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    await query('INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)', 
                [firstName, lastName, email, hashedPassword, 'Usuario']); // Default role can be set here

    // Log the user in immediately after registration
    req.session.user = { email, role: 'Usuario' }; // Store user info in session
    return res.redirect('/dashboard'); // Redirect to dashboard
  } catch (error) {
    console.error('Error during registration:', error);
    return res.render('login/index', { title: 'Sistema de Gestión de Libros', error: 'Error en el servidor. Inténtalo de nuevo.' });
  }
});

/* POST para manejar el logout */
router.post('/auth/logout', function(req, res, next) {
  req.session.destroy(err => {
    if (err) {
      console.error('Error during logout:', err);
      return res.redirect('/dashboard'); // Redirect to dashboard on error
    }
    res.redirect('/login'); // Redirect to login page after logout
  });
});

module.exports = router;
