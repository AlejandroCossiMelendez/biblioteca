var express = require('express');
var router = express.Router();
const { isAuthenticated } = require('../lib/auth');

/* GET home page. */
router.get('/', function(req, res, next) {
    if (req.session.user) {
        res.render('index2', { 
            title: 'Panel de Control',
            user: req.session.user
        });
    } else {
        res.render('index');
    }
});

// Direct route to index.ejs
router.get('/index', function(req, res, next) {
    res.render('index');
});

// Dashboard page (index2)
router.get('/index2', isAuthenticated, function(req, res, next) {
    res.render('index2', { 
        title: 'Panel de Control',
        user: req.session.user
    });
});

// Panel route redirects to index2
router.get('/panel', isAuthenticated, function(req, res, next) {
    res.redirect('/index2');
});

module.exports = router;
