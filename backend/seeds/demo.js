require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, User, Visit } = require('../models');
const logger = require('../utils/logger');

const demoVisits = [
  { visitor_name: 'Carlos García López', visitor_document: 'DNI-12345678A', visitor_company: 'TechSolutions S.L.', visitor_email: 'carlos@techsolutions.com', visitor_phone: '+34 612 345 678', destination: 'Departamento IT', purpose: 'Mantenimiento de servidores', status: 'checked_in', daysAgo: 0 },
  { visitor_name: 'María Fernández Ruiz', visitor_document: 'DNI-87654321B', visitor_company: 'Consultoría ABC', visitor_email: 'maria@abc.com', visitor_phone: '+34 623 456 789', destination: 'Recursos Humanos', purpose: 'Reunión de consultoría', status: 'checked_out', daysAgo: 0 },
  { visitor_name: 'Pedro Martínez Sánchez', visitor_document: 'DNI-11223344C', visitor_company: 'Logística Express', visitor_email: 'pedro@logistica.com', visitor_phone: '+34 634 567 890', destination: 'Almacén', purpose: 'Entrega de paquetes', status: 'checked_out', daysAgo: 0 },
  { visitor_name: 'Ana López Díaz', visitor_document: 'DNI-55667788D', visitor_company: 'Diseño Creativo', visitor_email: 'ana@diseno.com', visitor_phone: '+34 645 678 901', destination: 'Marketing', purpose: 'Presentación de propuesta', status: 'checked_in', daysAgo: 0 },
  { visitor_name: 'Roberto Silva Torres', visitor_document: 'DNI-99887766E', visitor_company: 'Seguridad Total', visitor_email: 'roberto@seguridad.com', visitor_phone: '+34 656 789 012', destination: 'Dirección General', purpose: 'Auditoría de seguridad', status: 'checked_in', daysAgo: 1 },
  { visitor_name: 'Laura Jiménez Castro', visitor_document: 'DNI-33445566F', visitor_company: '', visitor_email: 'laura@gmail.com', visitor_phone: '+34 667 890 123', destination: 'Recursos Humanos', purpose: 'Entrevista de trabajo', status: 'checked_out', daysAgo: 1 },
  { visitor_name: 'Miguel Ángel Ramos', visitor_document: 'DNI-77889900G', visitor_company: 'Electricidad Pro', visitor_email: 'miguel@elpro.com', visitor_phone: '+34 678 901 234', destination: 'Mantenimiento', purpose: 'Reparación eléctrica', status: 'checked_out', daysAgo: 1 },
  { visitor_name: 'Isabel Moreno Vega', visitor_document: 'DNI-22334455H', visitor_company: 'Auditores Asociados', visitor_email: 'isabel@auditores.com', visitor_phone: '+34 689 012 345', destination: 'Contabilidad', purpose: 'Auditoría trimestral', status: 'checked_out', daysAgo: 2 },
  { visitor_name: 'Fernando Navarro Peña', visitor_document: 'DNI-66778899I', visitor_company: 'Catering Deluxe', visitor_email: 'fernando@catering.com', visitor_phone: '+34 690 123 456', destination: 'Cafetería', purpose: 'Presupuesto servicio catering', status: 'checked_out', daysAgo: 2 },
  { visitor_name: 'Sofía Herrera Molina', visitor_document: 'DNI-44556677J', visitor_company: 'FormaTech', visitor_email: 'sofia@formatech.com', visitor_phone: '+34 601 234 567', destination: 'Departamento IT', purpose: 'Capacitación de personal', status: 'checked_out', daysAgo: 2 },
  { visitor_name: 'Alejandro Cruz Medina', visitor_document: 'DNI-88990011K', visitor_company: 'Legal Partners', visitor_email: 'alejandro@legal.com', visitor_phone: '+34 612 345 679', destination: 'Dirección General', purpose: 'Asesoría legal', status: 'checked_out', daysAgo: 3 },
  { visitor_name: 'Carmen Ortiz Blanco', visitor_document: 'DNI-00112233L', visitor_company: '', visitor_email: 'carmen@hotmail.com', visitor_phone: '+34 623 456 780', destination: 'Recursos Humanos', purpose: 'Entrega de documentación', status: 'checked_out', daysAgo: 3 },
  { visitor_name: 'David Ruiz Guerrero', visitor_document: 'DNI-55443322M', visitor_company: 'PrintMax', visitor_email: 'david@printmax.com', visitor_phone: '+34 634 567 891', destination: 'Marketing', purpose: 'Entrega de material impreso', status: 'checked_out', daysAgo: 4 },
  { visitor_name: 'Elena Vargas Domínguez', visitor_document: 'DNI-99001122N', visitor_company: 'Seguros Confianza', visitor_email: 'elena@seguros.com', visitor_phone: '+34 645 678 902', destination: 'Contabilidad', purpose: 'Renovación de póliza', status: 'checked_out', daysAgo: 4 },
  { visitor_name: 'Javier Muñoz Serrano', visitor_document: 'DNI-33221100O', visitor_company: 'Clima Perfect', visitor_email: 'javier@clima.com', visitor_phone: '+34 656 789 013', destination: 'Mantenimiento', purpose: 'Revisión aire acondicionado', status: 'checked_out', daysAgo: 5 },
  { visitor_name: 'Patricia Delgado Ríos', visitor_document: 'DNI-77665544P', visitor_company: 'EventosPro', visitor_email: 'patricia@eventos.com', visitor_phone: '+34 667 890 124', destination: 'Dirección General', purpose: 'Organización evento corporativo', status: 'checked_out', daysAgo: 5 },
  { visitor_name: 'Ricardo Soto Peña', visitor_document: 'DNI-11009988Q', visitor_company: 'NetSecurity', visitor_email: 'ricardo@netsec.com', visitor_phone: '+34 678 901 235', destination: 'Departamento IT', purpose: 'Instalación firewall', status: 'checked_out', daysAgo: 6 },
  { visitor_name: 'Marta Iglesias Roca', visitor_document: 'DNI-44332211R', visitor_company: '', visitor_email: 'marta@yahoo.com', visitor_phone: '+34 689 012 346', destination: 'Recursos Humanos', purpose: 'Proceso de selección', status: 'cancelled', daysAgo: 6 },
  { visitor_name: 'Andrés Peña Cortés', visitor_document: 'DNI-88776655S', visitor_company: 'Mobiliario Office', visitor_email: 'andres@office.com', visitor_phone: '+34 690 123 457', destination: 'Almacén', purpose: 'Entrega de mobiliario', status: 'checked_out', daysAgo: 7 },
  { visitor_name: 'Lucía Romero Gil', visitor_document: 'DNI-22110099T', visitor_company: 'Pharmagen', visitor_email: 'lucia@pharma.com', visitor_phone: '+34 601 234 568', destination: 'Dirección General', purpose: 'Presentación de producto', status: 'checked_out', daysAgo: 7 },
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
