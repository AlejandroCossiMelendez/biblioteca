const bcrypt = require('bcrypt');
const db = require('./lib/db');

async function updateAdminPassword() {
    try {
        const password = 'admin123'; // Contraseña por defecto
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, 10);

        // Actualizar la contraseña del administrador
        const query = `
            UPDATE users u
            JOIN roles r ON r.id = u.role_id
            SET u.password = ?
            WHERE r.name = 'admin' AND u.username = 'admin'`;

        db.query(query, [hashedPassword], (error, result) => {
            if (error) {
                console.error('Error al actualizar contraseña:', error);
                process.exit(1);
            }
            console.log('Contraseña de administrador actualizada exitosamente');
            console.log('Usuario: admin');
            console.log('Contraseña: admin123');
            process.exit(0);
        });
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateAdminPassword(); 