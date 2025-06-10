const db = require('./db');

const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
};

const isNotAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    res.redirect('/');
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        if (roles.includes(req.session.user.role)) {
            return next();
        }

        req.flash('error', 'No tienes permiso para acceder a esta sección');
        res.redirect('/');
    };
};

// Middleware para verificar acceso a rutas específicas
const checkRouteAccess = (req, res, next) => {
    // Si no hay usuario en la sesión o es una ruta pública, permitir el acceso
    if (!req.session.user || req.path === '/' || req.path.startsWith('/auth/')) {
        return next();
    }

    const role = req.session.user.role;
    const path = req.path;

    // Rutas permitidas por rol
    const allowedRoutes = {
        'admin': ['/authors', '/editorials', '/books', '/categories', '/usuarios', '/loans'],
        'librarian': ['/books', '/loans'],
        'user': ['/loans']
    };

    // Verificar si la ruta base está permitida para el rol
    const basePath = '/' + path.split('/')[1];
    if (!allowedRoutes[role] || !allowedRoutes[role].includes(basePath)) {
        return res.redirect('/');
    }

    next();
};

function getUserRole(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.id = ?`;
        
        db.query(query, [userId], (error, results) => {
            if (error) {
                reject(error);
            } else if (results.length === 0) {
                reject(new Error('Usuario no encontrado'));
            } else {
                resolve(results[0].role_name);
            }
        });
    });
}

module.exports = {
    isAuthenticated,
    isNotAuthenticated,
    checkRole,
    checkRouteAccess,
    getUserRole
}; 