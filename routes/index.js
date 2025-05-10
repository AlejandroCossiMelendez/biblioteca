var express = require('express');
var router = express.Router();

/* GET página de inicio. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Sistema de Gestión de Libros - CRUD con Node.js, Express y MySQL' });
});

module.exports = router;
