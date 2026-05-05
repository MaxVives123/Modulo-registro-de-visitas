require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, User, Visit } = require('../models');
const logger = require('../utils/logger');

const demoVisits = [
  { visitor_name: 'Visitante Demo 01', visitor_document: 'DEMO-0001', visitor_company: 'TechSolutions S.L.', visitor_email: 'demo01@example.test', visitor_phone: '+34 612 345 678', destination: 'Departamento IT', purpose: 'Mantenimiento de servidores', status: 'checked_in', daysAgo: 0 },
  { visitor_name: 'Visitante Demo 02', visitor_document: 'DEMO-0002', visitor_company: 'Consultoría ABC', visitor_email: 'demo02@example.test', visitor_phone: '+34 623 456 789', destination: 'Recursos Humanos', purpose: 'Reunión de consultoría', status: 'checked_out', daysAgo: 0 },
  { visitor_name: 'Visitante Demo 03', visitor_document: 'DEMO-0003', visitor_company: 'Logística Express', visitor_email: 'demo03@example.test', visitor_phone: '+34 634 567 890', destination: 'Almacén', purpose: 'Entrega de paquetes', status: 'checked_out', daysAgo: 0 },
  { visitor_name: 'Visitante Demo 04', visitor_document: 'DEMO-0004', visitor_company: 'Diseño Creativo', visitor_email: 'demo04@example.test', visitor_phone: '+34 645 678 901', destination: 'Marketing', purpose: 'Presentación de propuesta', status: 'checked_in', daysAgo: 0 },
  { visitor_name: 'Visitante Demo 05', visitor_document: 'DEMO-0005', visitor_company: 'Seguridad Total', visitor_email: 'demo05@example.test', visitor_phone: '+34 656 789 012', destination: 'Dirección General', purpose: 'Auditoría de seguridad', status: 'checked_in', daysAgo: 1 },
  { visitor_name: 'Visitante Demo 06', visitor_document: 'DEMO-0006', visitor_company: '', visitor_email: 'demo06@example.test', visitor_phone: '+34 667 890 123', destination: 'Recursos Humanos', purpose: 'Entrevista de trabajo', status: 'checked_out', daysAgo: 1 },
  { visitor_name: 'Visitante Demo 07', visitor_document: 'DEMO-0007', visitor_company: 'Electricidad Pro', visitor_email: 'demo07@example.test', visitor_phone: '+34 678 901 234', destination: 'Mantenimiento', purpose: 'Reparación eléctrica', status: 'checked_out', daysAgo: 1 },
  { visitor_name: 'Visitante Demo 08', visitor_document: 'DEMO-0008', visitor_company: 'Auditores Asociados', visitor_email: 'demo08@example.test', visitor_phone: '+34 689 012 345', destination: 'Contabilidad', purpose: 'Auditoría trimestral', status: 'checked_out', daysAgo: 2 },
  { visitor_name: 'Visitante Demo 09', visitor_document: 'DEMO-0009', visitor_company: 'Catering Deluxe', visitor_email: 'demo09@example.test', visitor_phone: '+34 690 123 456', destination: 'Cafetería', purpose: 'Presupuesto servicio catering', status: 'checked_out', daysAgo: 2 },
  { visitor_name: 'Visitante Demo 10', visitor_document: 'DEMO-0010', visitor_company: 'FormaTech', visitor_email: 'demo10@example.test', visitor_phone: '+34 601 234 567', destination: 'Departamento IT', purpose: 'Capacitación de personal', status: 'checked_out', daysAgo: 2 },
  { visitor_name: 'Visitante Demo 11', visitor_document: 'DEMO-0011', visitor_company: 'Legal Partners', visitor_email: 'demo11@example.test', visitor_phone: '+34 612 345 679', destination: 'Dirección General', purpose: 'Asesoría legal', status: 'checked_out', daysAgo: 3 },
  { visitor_name: 'Visitante Demo 12', visitor_document: 'DEMO-0012', visitor_company: '', visitor_email: 'demo12@example.test', visitor_phone: '+34 623 456 780', destination: 'Recursos Humanos', purpose: 'Entrega de documentación', status: 'checked_out', daysAgo: 3 },
  { visitor_name: 'Visitante Demo 13', visitor_document: 'DEMO-0013', visitor_company: 'PrintMax', visitor_email: 'demo13@example.test', visitor_phone: '+34 634 567 891', destination: 'Marketing', purpose: 'Entrega de material impreso', status: 'checked_out', daysAgo: 4 },
  { visitor_name: 'Visitante Demo 14', visitor_document: 'DEMO-0014', visitor_company: 'Seguros Confianza', visitor_email: 'demo14@example.test', visitor_phone: '+34 645 678 902', destination: 'Contabilidad', purpose: 'Renovación de póliza', status: 'checked_out', daysAgo: 4 },
  { visitor_name: 'Visitante Demo 15', visitor_document: 'DEMO-0015', visitor_company: 'Clima Perfect', visitor_email: 'demo15@example.test', visitor_phone: '+34 656 789 013', destination: 'Mantenimiento', purpose: 'Revisión aire acondicionado', status: 'checked_out', daysAgo: 5 },
  { visitor_name: 'Visitante Demo 16', visitor_document: 'DEMO-0016', visitor_company: 'EventosPro', visitor_email: 'demo16@example.test', visitor_phone: '+34 667 890 124', destination: 'Dirección General', purpose: 'Organización evento corporativo', status: 'checked_out', daysAgo: 5 },
  { visitor_name: 'Visitante Demo 17', visitor_document: 'DEMO-0017', visitor_company: 'NetSecurity', visitor_email: 'demo17@example.test', visitor_phone: '+34 678 901 235', destination: 'Departamento IT', purpose: 'Instalación firewall', status: 'checked_out', daysAgo: 6 },
  { visitor_name: 'Visitante Demo 18', visitor_document: 'DEMO-0018', visitor_company: '', visitor_email: 'demo18@example.test', visitor_phone: '+34 689 012 346', destination: 'Recursos Humanos', purpose: 'Proceso de selección', status: 'cancelled', daysAgo: 6 },
  { visitor_name: 'Visitante Demo 19', visitor_document: 'DEMO-0019', visitor_company: 'Mobiliario Office', visitor_email: 'demo19@example.test', visitor_phone: '+34 690 123 457', destination: 'Almacén', purpose: 'Entrega de mobiliario', status: 'checked_out', daysAgo: 7 },
  { visitor_name: 'Visitante Demo 20', visitor_document: 'DEMO-0020', visitor_company: 'Pharmagen', visitor_email: 'demo20@example.test', visitor_phone: '+34 601 234 568', destination: 'Dirección General', purpose: 'Presentación de producto', status: 'checked_out', daysAgo: 7 },
];

async function seed() {
  try {
    await sequelize.sync({ force: true });
    logger.info('Base de datos sincronizada (force: true)');

    const admin = await User.create({
      username: 'admin',
      password: 'admin123',
      full_name: 'Administrador del Sistema',
      role: 'admin',
    });

    const recepcion = await User.create({
      username: 'recepcion',
      password: 'recepcion123',
      full_name: 'Recepción Principal',
      role: 'user',
    });

    logger.info('Usuarios creados: admin / admin123, recepcion / recepcion123');

    const { v4: uuidv4 } = require('uuid');

    for (const data of demoVisits) {
      const date = new Date();
      date.setDate(date.getDate() - data.daysAgo);
      date.setHours(8 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

      const checkIn = new Date(date);
      let checkOut = null;
      if (data.status === 'checked_out') {
        checkOut = new Date(date);
        checkOut.setHours(checkOut.getHours() + 1 + Math.floor(Math.random() * 4));
      }

      await Visit.create({
        visitor_name: data.visitor_name,
        visitor_document: data.visitor_document,
        visitor_company: data.visitor_company,
        visitor_email: data.visitor_email,
        visitor_phone: data.visitor_phone,
        destination: data.destination,
        purpose: data.purpose,
        qr_code: uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase(),
        status: data.status,
        check_in: data.status !== 'cancelled' ? checkIn : null,
        check_out: checkOut,
        notes: '',
        created_by: Math.random() > 0.5 ? admin.id : recepcion.id,
        created_at: date,
        updated_at: checkOut || date,
      });
    }

    logger.info(`${demoVisits.length} visitas de demostración creadas`);
    logger.info('Seed completado exitosamente');
    process.exit(0);
  } catch (error) {
    logger.error('Error en seed:', error);
    process.exit(1);
  }
}

seed();
