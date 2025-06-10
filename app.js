var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var flash = require('express-flash');
var session = require('express-session');
var mysql = require('mysql');
var connection  = require('./lib/db');

var indexRouter = require('./routes/index');
var usuariosRouter = require('./routes/usuarios');
var booksRouter = require('./routes/books');
var authorsRouter = require('./routes/authors');
var editorialsRouter = require('./routes/editorials');
var categoriesRouter = require('./routes/categories');
var authRouter = require('./routes/auth');
var loansRouter = require('./routes/loans');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesión
app.use(session({ 
    cookie: { 
        maxAge: 3600000,
        httpOnly: true
    },
    store: new session.MemoryStore,
    saveUninitialized: false,
    resave: false,
    secret: 'secret'
}));

app.use(flash());

// Hacer disponible el usuario en todas las vistas
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// Middleware de autenticación
const requireAuth = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
        return next();
    }
    req.flash('error', 'Por favor inicie sesión para continuar');
    return res.redirect('/auth/login');
};

// Middleware de control de acceso por rol
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.session.user || !allowedRoles.includes(req.session.user.role)) {
            req.flash('error', 'No tienes permiso para acceder a esta sección');
            return res.redirect('/auth/login');
        }
        next();
    };
};

// Rutas públicas
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use(express.static('public'));

// Rutas protegidas con autenticación y control de roles
app.use('/usuarios', requireAuth, checkRole(['admin']), usuariosRouter);
app.use('/books', requireAuth, checkRole(['admin', 'librarian']), booksRouter);
app.use('/authors', requireAuth, checkRole(['admin']), authorsRouter);
app.use('/editorials', requireAuth, checkRole(['admin']), editorialsRouter);
app.use('/categories', requireAuth, checkRole(['admin']), categoriesRouter);
app.use('/loans', requireAuth, checkRole(['admin', 'librarian', 'user']), loansRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    if (!req.session || !req.session.isAuthenticated) {
        return res.redirect('/auth/login');
    }
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    if (!req.session || !req.session.isAuthenticated) {
        return res.redirect('/auth/login');
    }

    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
