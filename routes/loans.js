const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { isAuthenticated, checkRole } = require('../lib/auth');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// Listar préstamos (admin y bibliotecario ven todos, usuario ve solo los suyos)
router.get('/', isAuthenticated, (req, res) => {
    let query = `
        SELECT l.*, 
                b.id_book as book_id,
               b.title as book_title,
               u.full_name as user_name,
               u.id as user_id, 
               c.full_name as created_by_name,
               CASE 
                   WHEN l.status = 'returned' THEN 'returned'
                   WHEN l.status = 'overdue' OR (l.status = 'active' AND l.due_date < NOW()) THEN 'overdue'
                   ELSE 'active'
               END as display_status
        FROM loans l
        JOIN books b ON l.book_id = b.id_book
        JOIN users u ON l.user_id = u.id
        JOIN users c ON l.created_by = c.id
        WHERE 1=1`;
    
    const params = [];
    
    // Si es usuario regular, solo ve sus préstamos
    if (req.session.user.role === 'user') {
        query += ' AND l.user_id = ?';
        params.push(req.session.user.id);
    }
    
    query += ' ORDER BY l.created_at DESC';
    
    db.query(query, params, (error, loans) => {
        if (error) {
            console.error('Error al obtener préstamos:', error);
            req.flash('error', 'Error al obtener préstamos');
            return res.redirect('/');
        }
        res.render('loans/index', { 
            loans,
            messages: req.flash(),
            user: req.session.user
        });
    });
});
router.get('/create', isAuthenticated, (req, res) => {
    const currentUser = req.session.user;

    // Si no es librarian o admin, solo puede crear su propio préstamo
    if (currentUser.role !== 'librarian' && currentUser.role !== 'admin') {
        req.flash('error', 'Solo los bibliotecarios o administradores pueden crear préstamos para otros');
        return res.redirect('/loans');
    }

    // Consulta para libros disponibles (simplificada para el select)
    const booksForFilterQuery = `
        SELECT b.id_book, b.title
        FROM books AS b
        WHERE b.state = 1
        AND b.is_deleted = 0
        ORDER BY b.title ASC`;

    // Consulta detallada para el formulario de creación
    const booksForFormQuery = `
        SELECT
            b.id_book,
            b.title,
            b.available,
            b.isbn,
            b.year,
            a.name AS author
        FROM books AS b
        JOIN authors AS a ON a.id_author = b.id_author
        WHERE b.state = 1
        AND b.available > 0
        AND b.is_deleted = 0
        ORDER BY b.title ASC`;

    // Consulta de usuarios
    const usersQuery = `
        SELECT id, full_name, email 
        FROM users 
        WHERE role_id = 3 
        ORDER BY full_name ASC`;

    // Ejecutar todas las consultas necesarias
    db.query(booksForFilterQuery, (filterBooksError, filterBooks) => {
        if (filterBooksError) {
            console.error('Error al obtener libros para filtro:', filterBooksError);
            req.flash('error', 'Error al obtener la lista de libros');
            return res.redirect('/loans');
        }

        db.query(booksForFormQuery, (formBooksError, formBooks) => {
            if (formBooksError) {
                console.error('Error al obtener libros para formulario:', formBooksError);
                req.flash('error', 'Error al obtener la lista de libros disponibles');
                return res.redirect('/loans');
            }

            db.query(usersQuery, (usersError, users) => {
                if (usersError) {
                    console.error('Error al obtener usuarios:', usersError);
                    req.flash('error', 'Error al obtener la lista de usuarios');
                    return res.redirect('/loans');
                }

                res.render('loans/create', {
                    books: formBooks, // Libros detallados para el formulario
                    filterBooks: filterBooks, // Libros simplificados para el filtro
                    users,
                    messages: req.flash(),
                    user: currentUser
                });
            });
        });
    });
});
router.post('/', isAuthenticated, (req, res) => {
    const { book_id, due_date, user_id: formUserId } = req.body;
    const sessionUser = req.session.user;

    // Validar campos
    if (!book_id || !due_date || (!formUserId && sessionUser.role !== 'user')) {
        req.flash('error', 'Por favor complete todos los campos requeridos');
        return res.redirect('/loans/create');
    }

    // Determinar para quién es el préstamo
    let user_id;
    if (sessionUser.role === 'librarian' || sessionUser.role === 'admin') {
        user_id = formUserId; // Usa el user_id del formulario
    } else {
        user_id = sessionUser.id; // Solo puede prestarse a sí mismo
    }

    const created_by = sessionUser.id;

    // Verificar disponibilidad del libro
    db.query('SELECT available FROM books WHERE id_book = ? AND state = 1', [book_id], (error, results) => {
        if (error) {
            console.error('Error al verificar libro:', error);
            req.flash('error', 'Error al verificar disponibilidad del libro');
            return res.redirect('/loans/create');
        }

        if (!results || results.length === 0 || results[0].available <= 0) {
            req.flash('error', 'El libro seleccionado no está disponible');
            return res.redirect('/loans/create');
        }

        // Iniciar transacción
        db.beginTransaction(error => {
            if (error) {
                console.error('Error al iniciar transacción:', error);
                req.flash('error', 'Error al crear préstamo');
                return res.redirect('/loans/create');
            }

            const loanQuery = `
                INSERT INTO loans (user_id, book_id, due_date, created_by, status) 
                VALUES (?, ?, ?, ?, 'active')`;

            db.query(loanQuery, [user_id, book_id, due_date, created_by], (error, result) => {
                if (error) {
                    return db.rollback(() => {
                        console.error('Error al crear préstamo:', error);
                        req.flash('error', 'Error al crear el préstamo');
                        res.redirect('/loans/create');
                    });
                }

                const updateBookQuery = `
                    UPDATE books 
                    SET available = available - 1 
                    WHERE id_book = ? AND available > 0`;

                db.query(updateBookQuery, [book_id], (error, updateResult) => {
                    if (error || updateResult.affectedRows === 0) {
                        return db.rollback(() => {
                            console.error('Error al actualizar libro:', error);
                            req.flash('error', 'Error al actualizar disponibilidad del libro');
                            res.redirect('/loans/create');
                        });
                    }

                    db.commit(error => {
                        if (error) {
                            return db.rollback(() => {
                                console.error('Error al finalizar préstamo:', error);
                                req.flash('error', 'Error al finalizar el préstamo');
                                res.redirect('/loans/create');
                            });
                        }

                        req.flash('success', 'Préstamo creado exitosamente');
                        res.redirect('/loans');
                    });
                });
            });
        });
    });
});


// Devolver libro (solo usuarios)
router.post('/return/:id', isAuthenticated, (req, res) => {
    // Verificar que sea un usuario
    if (req.session.user.role !== 'librarian' && req.session.user.role !== 'admin') {
        req.flash('error', 'Solo los usuarios pueden devolver libros');
        return res.redirect('/loans');
    }

    const loanId = req.params.id;
    
    // Obtener información del préstamo y verificar que pertenezca al usuario
    db.query('SELECT book_id, status, user_id, due_date FROM loans WHERE id = ?', [loanId], (error, results) => {
        if (error || results.length === 0) {
            console.error('Error al obtener préstamo:', error);
            req.flash('error', 'Préstamo no encontrado');
            return res.redirect('/loans');
        }

        if (results[0].status === 'returned') {
            req.flash('error', 'Este libro ya fue devuelto');
            return res.redirect('/loans');
        }

        const bookId = results[0].book_id;
        const dueDate = new Date(results[0].due_date);
        const isOverdue = dueDate < new Date();
        
        // Iniciar transacción
        db.beginTransaction(error => {
            if (error) {
                console.error('Error al iniciar transacción:', error);
                req.flash('error', 'Error al procesar la devolución');
                return res.redirect('/loans');
            }
            
            // Actualizar préstamo
            const updateLoanQuery = `
                UPDATE loans 
                SET status = 'returned', return_date = CURRENT_TIMESTAMP 
                WHERE id = ? AND (status = 'active' OR status = 'overdue')`;
            
            db.query(updateLoanQuery, [loanId], (error, updateResult) => {
                if (error || updateResult.affectedRows === 0) {
                    return db.rollback(() => {
                        console.error('Error al actualizar préstamo:', error);
                        req.flash('error', 'Error al actualizar el préstamo');
                        res.redirect('/loans');
                    });
                }
                
                // Actualizar copias disponibles
                const updateBookQuery = `
                    UPDATE books 
                    SET available = available + 1 
                    WHERE id_book = ?`;
                
                db.query(updateBookQuery, [bookId], (error, updateResult) => {
                    if (error || updateResult.affectedRows === 0) {
                        return db.rollback(() => {
                            console.error('Error al actualizar libro:', error);
                            req.flash('error', 'Error al actualizar disponibilidad del libro');
                            res.redirect('/loans');
                        });
                    }
                    
                    db.commit(error => {
                        if (error) {
                            return db.rollback(() => {
                                console.error('Error al finalizar devolución:', error);
                                req.flash('error', 'Error al finalizar la devolución');
                                res.redirect('/loans');
                            });
                        }
                        
                        // Mostrar mensaje según si está vencido o no
                        if (isOverdue) {
                            req.flash('success', 'Libro devuelto exitosamente, pero con retraso. Por favor, devuelva los libros a tiempo en el futuro.');
                        } else {
                            req.flash('success', 'Libro devuelto exitosamente');
                        }
                        res.redirect('/loans');
                    });
                });
            });
        });
    });
});
// Eliminar préstamo (solo librarian y admin)
router.post('/delete/:id', isAuthenticated, (req, res) => {
    // Verificar que sea librarian o admin
    if (req.session.user.role !== 'librarian' && req.session.user.role !== 'admin') {
        req.flash('error', 'Solo los bibliotecarios o administradores pueden eliminar préstamos');
        return res.redirect('/loans');
    }

    const loanId = req.params.id;

    // Verificar que el préstamo exista y esté devuelto
    const checkQuery = `
        SELECT l.*, b.title as book_title 
        FROM loans l 
        JOIN books b ON l.book_id = b.id_book 
        WHERE l.id = ? AND l.status = 'returned'`;

    db.query(checkQuery, [loanId], (error, results) => {
        if (error) {
            console.error('Error al verificar préstamo:', error);
            req.flash('error', 'Error al procesar la solicitud');
            return res.redirect('/loans');
        }

        if (!results || results.length === 0) {
            req.flash('error', 'No se encontró el préstamo o no está devuelto');
            return res.redirect('/loans');
        }

        // El préstamo está devuelto, se puede eliminar
        db.query('DELETE FROM loans WHERE id = ?', [loanId], (error) => {
            if (error) {
                console.error('Error al eliminar préstamo:', error);
                req.flash('error', 'Error al eliminar el préstamo');
                return res.redirect('/loans');
            }

            req.flash('success', 'Préstamo eliminado exitosamente');
            res.redirect('/loans');
        });
    });
});


// Solicitar devolución de libro (admin y bibliotecario)
router.post('/request-return/:id', isAuthenticated, async (req, res) => {
    // Verificar que sea admin o bibliotecario
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'librarian') {
        req.flash('error', 'No tienes permiso para realizar esta acción');
        return res.redirect('/loans');
    }

    const loanId = req.params.id;
    
    // Obtener información del préstamo
    db.query(`
        SELECT l.*, b.title as book_title, u.email as user_email, u.full_name as user_name, u.id as user_id 
        FROM loans l
        JOIN books b ON l.book_id = b.id_book
        JOIN users u ON l.user_id = u.id
        WHERE l.id = ? AND l.status != 'returned'`, 
        [loanId], 
        async (error, results) => {
            if (error || results.length === 0) {
                console.error('Error al obtener préstamo:', error);
                req.flash('error', 'Préstamo no encontrado o ya devuelto');
                return res.redirect('/loans');
            }

            const loan = results[0];
            const dueDate = new Date(loan.due_date);
            const today = new Date();

            // Verificar que el préstamo esté vencido
            if (dueDate >= today) {
                req.flash('error', 'Este préstamo aún no está vencido');
                return res.redirect('/loans');
            }

            try {
                // Crear notificación para el usuario
                const mensaje = `Se solicita la devolución del libro "${loan.book_title}" que debió ser devuelto el ${dueDate.toLocaleDateString()}. Por favor, devuélvalo lo antes posible.`;
                await notificationsRouter.createNotification(loan.user_id, mensaje);

                // Actualizar el estado del préstamo a vencido
                await new Promise((resolve, reject) => {
                    db.query('UPDATE loans SET status = ? WHERE id = ?', ['overdue', loanId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                req.flash('success', `Se ha enviado una solicitud de devolución a ${loan.user_name} para el libro "${loan.book_title}"`);
            } catch (err) {
                console.error('Error al procesar la solicitud:', err);
                req.flash('error', 'Error al procesar la solicitud de devolución');
            }
            res.redirect('/loans');
        }
    );
});
// Ruta para obtener datos filtrados (AJAX)
router.post('/data', isAuthenticated, (req, res) => {
    let query = `
        SELECT l.*, 
               b.title as book_title,
               u.full_name as user_name,
               u.id as user_id, 
               c.full_name as created_by_name,
               CASE 
                   WHEN l.status = 'returned' THEN 'returned'
                   WHEN l.status = 'overdue' OR (l.status = 'active' AND l.due_date < NOW()) THEN 'overdue'
                   ELSE 'active'
               END as display_status
        FROM loans l
        JOIN books b ON l.book_id = b.id_book
        JOIN users u ON l.user_id = u.id
        JOIN users c ON l.created_by = c.id
        WHERE 1=1`;
    
    const params = [];
    
    // Filtros
    if (req.body.startDate) {
        query += ' AND DATE(l.loan_date) >= ?';
        params.push(req.body.startDate);
    }
    
    if (req.body.endDate) {
        query += ' AND DATE(l.loan_date) <= ?';
        params.push(req.body.endDate);
    }
    
    if (req.body.status) {
        if (req.body.status === 'overdue') {
            query += ' AND (l.status = ? OR (l.status = ? AND l.due_date < NOW()))';
            params.push('overdue', 'active');
        } else {
            query += ' AND l.status = ?';
            params.push(req.body.status);
        }
    }
    
    // Cambio clave: ahora filtramos por book_id en lugar de título
    if (req.body.book) {
        query += ' AND l.book_id = ?';  // Cambiado a filtrar por ID
        params.push(req.body.book);     // El valor ya es el ID directamente
    }
    
    // Si es usuario regular, solo ve sus préstamos
    if (req.session.user.role === 'user') {
        query += ' AND l.user_id = ?';
        params.push(req.session.user.id);
    }
    
    // Ordenar
    query += ' ORDER BY l.loan_date DESC';
    
    db.query(query, params, (error, loans) => {
        if (error) {
            console.error('Error al obtener préstamos filtrados:', error);
            return res.status(500).json({ error: 'Error al obtener préstamos' });
        }
        
        // Formatear datos para DataTables
        const data = loans.map(loan => {
            const row = [
                loan.id,
                loan.book_title,
                loan.user_name,
                new Date(loan.loan_date).toLocaleDateString(),
                loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '-',
                loan.display_status === 'returned' ? 
                    '<span class="badge bg-success">Devuelto</span>' : 
                    loan.display_status === 'overdue' ? 
                    '<span class="badge bg-danger">Vencido</span>' : 
                    '<span class="badge bg-warning">Prestado</span>'
            ];
            
            // Acciones (si es admin o librarian)
            if (req.session.user.role === 'librarian' || req.session.user.role === 'admin') {
                let actions = '';
                if (loan.status !== 'returned') {
                    actions += `
                        <form action="/loans/return/${loan.id}" method="POST" class="d-inline">
                            <button type="submit" class="btn btn-action btn-success btn-sm" onclick="return confirm('¿Estás seguro de devolver este libro?')">
                                <i class="fas fa-undo-alt"></i> Devolver
                            </button>
                        </form>`;
                } else {
                    actions += `
                        <form action="/loans/delete/${loan.id}" method="POST" class="d-inline">
                            <button type="submit" class="btn btn-action btn-danger btn-sm" 
                                    onclick="return confirm('¿Estás seguro de eliminar este registro de préstamo?')">
                                <i class="fas fa-trash-can"></i> Eliminar
                            </button>
                        </form>`;
                }
                row.push(`<div class="text-center">${actions}</div>`);
            }
            
            return row;
        });
        
        res.json({
            draw: parseInt(req.body.draw),
            recordsTotal: loans.length,
            recordsFiltered: loans.length,
            data: data
        });
    });
});
function drawTable(doc, table) {
    const margin = 40;
    const logoHeight = 50;
    const startY = margin + logoHeight + 20; // Espacio después del logo
    const pageWidth = doc.page.width - 2 * margin;
    const colWidth = pageWidth / table.headers.length;
    let y = startY;

    // Estilos
    const headerBackgroundColor = '#003366';
    const headerTextColor = '#FFFFFF';
    const rowBackgroundColor = '#F5F5F5';
    const rowHeight = 30;
    const headerHeight = 30;

    // Función para agregar logo y encabezado
    const addHeaderWithLogo = () => {
        // Agregar logo (ajusta la ruta según tu estructura de archivos)
        doc.image('./public/images/logo-report.png', margin, margin, {
            width: 150,
            height: logoHeight,
            align: 'left'
        });

    };

    // Agregar logo y encabezado a la primera página
    addHeaderWithLogo();

    // Dibujar encabezados de tabla
    doc.fillColor(headerBackgroundColor)
       .rect(margin, y, pageWidth, headerHeight)
       .fill();

    doc.fillColor(headerTextColor)
       .font('Helvetica-Bold')
       .fontSize(12);

    table.headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth + 5, y + 8, {
            width: colWidth - 10,
            align: 'left'
        });
    });

    y += headerHeight;

    // Dibujar filas
    doc.font('Helvetica')
       .fontSize(11);

    table.rows.forEach((row, rowIndex) => {
        // Verificar si necesita nueva página
        if (y > doc.page.height - margin - rowHeight) {
            doc.addPage();
            // Agregar logo y encabezado en cada nueva página
            addHeaderWithLogo();
            y = startY;
        }

        // Alternar fondo de fila
        if (rowIndex % 2 === 0) {
            doc.fillColor(rowBackgroundColor)
               .rect(margin, y, pageWidth, rowHeight)
               .fill();
        }

        // Texto de la fila
        doc.fillColor('black');
        row.forEach((cell, i) => {
            doc.text(String(cell), margin + i * colWidth + 5, y + 7, {
                width: colWidth - 10,
                align: 'left'
            });
        });

        y += rowHeight;
    });

    // Línea final
    doc.moveTo(margin, y)
       .lineTo(margin + pageWidth, y)
       .stroke();
}



// Ruta para generar PDF (versión con callbacks)
router.get('/report/pdf', isAuthenticated, (req, res) => {
    // Consulta para obtener el título del libro cuando se filtra por ID
    const getBookTitle = (bookId, callback) => {
        if (!bookId) return callback(null, '');
        
        const bookQuery = 'SELECT title FROM books WHERE id_book = ?';
        db.query(bookQuery, [bookId], (error, results) => {
            if (error) return callback(error);
            callback(null, results[0]?.title || '');
        });
    };

    getBookTitle(req.query.book, (bookError, bookTitle) => {
        if (bookError) {
            console.error('Error al obtener título del libro:', bookError);
            req.flash('error', 'Error al generar el reporte');
            return res.redirect('/loans');
        }

        let query = `
            SELECT l.*, 
                   b.title as book_title,
                   u.full_name as user_name,
                   u.id as user_id, 
                   c.full_name as created_by_name,
                   CASE 
                       WHEN l.status = 'returned' THEN 'Devuelto'
                       WHEN l.status = 'overdue' OR (l.status = 'active' AND l.due_date < NOW()) THEN 'Vencido'
                       ELSE 'Prestado'
                   END as display_status
            FROM loans l
            JOIN books b ON l.book_id = b.id_book
            JOIN users u ON l.user_id = u.id
            JOIN users c ON l.created_by = c.id
            WHERE 1=1`;
        
        const params = [];
        
        // Aplicar filtros de la URL
        if (req.query.startDate) {
            query += ' AND DATE(l.loan_date) >= ?';
            params.push(req.query.startDate);
        }
        
        if (req.query.endDate) {
            query += ' AND DATE(l.loan_date) <= ?';
            params.push(req.query.endDate);
        }
        
        if (req.query.status) {
            if (req.query.status === 'overdue') {
                query += ' AND (l.status = ? OR (l.status = ? AND l.due_date < NOW()))';
                params.push('overdue', 'active');
            } else {
                query += ' AND l.status = ?';
                params.push(req.query.status);
            }
        }
        
        // Filtramos por book_id
        if (req.query.book) {
            query += ' AND l.book_id = ?';
            params.push(req.query.book);
        }
        
        // Si es usuario regular, solo ve sus préstamos
        if (req.session.user.role === 'user') {
            query += ' AND l.user_id = ?';
            params.push(req.session.user.id);
        }
        
        // Ordenar
        query += ' ORDER BY l.loan_date DESC';
        
        db.query(query, params, (error, loans) => {
            if (error) {
                console.error('Error al obtener préstamos para PDF:', error);
                req.flash('error', 'Error al generar el reporte');
                return res.redirect('/loans');
            }
            
            // Crear documento PDF
            const doc = new PDFDocument();
            
            // Configurar encabezado para descarga
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=reporte-prestamos-${Date.now()}.pdf`);
            
            // Pipe el PDF a la respuesta
            doc.pipe(res);
            
            // Agregar contenido al PDF
            doc.fontSize(20).text('Reporte de Préstamos', { align: 'center' });
            doc.moveDown();
            
            // Información de filtros aplicados
            doc.fontSize(12).text('Filtros aplicados:', { underline: true });
            
            let filtersText = '';
            if (req.query.startDate) filtersText += `Desde: ${req.query.startDate}  `;
            if (req.query.endDate) filtersText += `Hasta: ${req.query.endDate}  `;
            if (req.query.status) filtersText += `Estado: ${req.query.status}  `;
            if (req.query.book) filtersText += `Libro: ${bookTitle}`;
            
            if (!filtersText) filtersText = 'Ningún filtro aplicado';
            
            doc.text(filtersText);
            doc.moveDown();
            
            // Fecha de generación
            doc.text(`Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
            doc.moveDown(2);
            
            // Tabla de préstamos
            const table = {
                headers: ['#', 'Libro', 'Usuario', 'Fecha Prést.', 'Fecha Devol.', 'Estado'],
                rows: []
            };
            
            loans.forEach((loan, index) => {
                table.rows.push([
                    (index + 1).toString(),
                    loan.book_title,
                    loan.user_name,
                    new Date(loan.loan_date).toLocaleDateString(),
                    loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '-',
                    loan.display_status
                ]);
            });
            
            // Dibujar tabla
            drawTable(doc, table);
            
            // Finalizar documento
            doc.end();
        });
    });
});
// Ruta para generar Excel (versión con callbacks)
router.get('/report/excel', isAuthenticated, (req, res) => {
    // Consulta para obtener el título del libro cuando se filtra por ID
    const getBookTitle = (bookId, callback) => {
        if (!bookId) return callback(null, '');
        
        const bookQuery = 'SELECT title FROM books WHERE id_book = ?';
        db.query(bookQuery, [bookId], (error, results) => {
            if (error) return callback(error);
            callback(null, results[0]?.title || '');
        });
    };

    getBookTitle(req.query.book, (bookError, bookTitle) => {
        if (bookError) {
            console.error('Error al obtener título del libro:', bookError);
            req.flash('error', 'Error al generar el reporte');
            return res.redirect('/loans');
        }

        let query = `
            SELECT l.*, 
                   b.title as book_title,
                   u.full_name as user_name,
                   u.id as user_id, 
                   c.full_name as created_by_name,
                   CASE 
                       WHEN l.status = 'returned' THEN 'Devuelto'
                       WHEN l.status = 'overdue' OR (l.status = 'active' AND l.due_date < NOW()) THEN 'Vencido'
                       ELSE 'Prestado'
                   END as display_status
            FROM loans l
            JOIN books b ON l.book_id = b.id_book
            JOIN users u ON l.user_id = u.id
            JOIN users c ON l.created_by = c.id
            WHERE 1=1`;
        
        const params = [];
        
        // Aplicar filtros
        if (req.query.startDate) {
            query += ' AND DATE(l.loan_date) >= ?';
            params.push(req.query.startDate);
        }
        
        if (req.query.endDate) {
            query += ' AND DATE(l.loan_date) <= ?';
            params.push(req.query.endDate);
        }
        
        if (req.query.status) {
            if (req.query.status === 'overdue') {
                query += ' AND (l.status = ? OR (l.status = ? AND l.due_date < NOW()))';
                params.push('overdue', 'active');
            } else {
                query += ' AND l.status = ?';
                params.push(req.query.status);
            }
        }
        
        if (req.query.book) {
            query += ' AND l.book_id = ?';
            params.push(req.query.book);
        }
        
        if (req.session.user.role === 'user') {
            query += ' AND l.user_id = ?';
            params.push(req.session.user.id);
        }
        
        query += ' ORDER BY l.loan_date DESC';
        
        db.query(query, params, (error, loans) => {
            if (error) {
                console.error('Error al obtener préstamos para Excel:', error);
                req.flash('error', 'Error al generar el reporte');
                return res.redirect('/loans');
            }

            try {
                // Crear workbook de Excel
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Préstamos');

                // Estilos
                const headerStyle = {
                    font: { bold: true, color: { argb: 'FFFFFFFF' } },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } },
                    border: { top: { style: 'thin' }, bottom: { style: 'thin' } }
                };

                // Agregar fila de título
                const titleRow = worksheet.addRow(['Reporte de Préstamos']);
                titleRow.font = { bold: true, size: 16 };
                worksheet.mergeCells('A1:F1');
                
                // Agregar filtros aplicados
                let filtersText = [];
                if (req.query.startDate) filtersText.push(`Desde: ${req.query.startDate}`);
                if (req.query.endDate) filtersText.push(`Hasta: ${req.query.endDate}`);
                if (req.query.status) filtersText.push(`Estado: ${req.query.status}`);
                if (req.query.book) filtersText.push(`Libro: ${bookTitle}`);
                
                if (filtersText.length > 0) {
                    const filterRow = worksheet.addRow([`Filtros aplicados: ${filtersText.join(', ')}`]);
                    worksheet.mergeCells('A2:F2');
                }
                
                // Fecha generación
                worksheet.addRow([`Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`]);
                worksheet.mergeCells('A3:F3');
                worksheet.addRow([]); // Espacio en blanco

                // Encabezados de tabla
                worksheet.addRow([
                    '#', 'Libro', 'Usuario', 'Fecha Préstamo', 'Fecha Devolución', 'Estado'
                ]).eachCell(cell => {
                    cell.style = headerStyle;
                });

                // Datos
                loans.forEach((loan, index) => {
                    worksheet.addRow([
                        index + 1,
                        loan.book_title,
                        loan.user_name,
                        new Date(loan.loan_date).toLocaleDateString(),
                        loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '-',
                        loan.display_status
                    ]);
                });

                // Ajustar ancho de columnas
                worksheet.columns = [
                    { key: 'id', width: 5 },
                    { key: 'book', width: 30 },
                    { key: 'user', width: 25 },
                    { key: 'loan_date', width: 15 },
                    { key: 'due_date', width: 15 },
                    { key: 'status', width: 15 }
                ];

                // Configurar respuesta
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=reporte-prestamos-${Date.now()}.xlsx`);
                
                // Enviar archivo
                workbook.xlsx.write(res)
                    .then(() => res.end())
                    .catch(err => {
                        console.error('Error al escribir Excel:', err);
                        req.flash('error', 'Error al generar el archivo Excel');
                        res.redirect('/loans');
                    });

            } catch (error) {
                console.error('Error al generar Excel:', error);
                req.flash('error', 'Error al generar el reporte en Excel');
                res.redirect('/loans');
            }
        });
    });
});
module.exports = router; 