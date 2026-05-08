const nodemailer = require('nodemailer');

const CLINIC_NAME = process.env.MAIL_FROM_NAME || 'Centro Medico ESMEIN';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);

function cleanText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.replace(/[<>]/g, '').trim().slice(0, 1000);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Metodo no permitido' });
    return;
  }

  const requiredEnv = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_TO'];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);

  if (missingEnv.length > 0) {
    console.error(`Missing mail environment variables: ${missingEnv.join(', ')}`);
    res.status(500).json({ success: false, error: 'Servicio de correo no configurado' });
    return;
  }

  const body = req.body || {};
  const nombre = cleanText(body.nombre);
  const apellido = cleanText(body.apellido);
  const telefono = cleanText(body.telefono);
  const correo = cleanText(body.correo);
  const especialidad = cleanText(body.especialidad, 'No especificada') || 'No especificada';
  const mensaje = cleanText(body.mensaje, 'Sin mensaje') || 'Sin mensaje';

  if (!nombre || !apellido || !telefono) {
    res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    return;
  }

  if (correo && !isEmail(correo)) {
    res.status(400).json({ success: false, error: 'Correo electronico invalido' });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const subject = `Nueva Solicitud de Cita - ${CLINIC_NAME}`;
  const text = [
    '=======================================',
    ' NUEVA SOLICITUD DE CITA',
    '=======================================',
    '',
    '********** IMPORTANTE **********',
    'NO RESPONDA ESTE CORREO.',
    'Debe comunicarse directamente con el paciente usando los datos indicados abajo.',
    '********************************',
    '',
    `Nombre:        ${nombre} ${apellido}`,
    `Telefono:      ${telefono}`,
    `Correo:        ${correo || 'No proporcionado'}`,
    `Especialidad:  ${especialidad}`,
    '',
    'Mensaje:',
    mensaje,
    '',
    '---------------------------------------',
    `Enviado desde el sitio web de ${CLINIC_NAME}`
  ].join('\n');

  try {
    await transporter.sendMail({
      from: `"${CLINIC_NAME}" <${process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO,
      replyTo: correo || process.env.SMTP_USER,
      subject,
      text
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mail send failed:', error);
    res.status(500).json({ success: false, error: 'No se pudo enviar el correo' });
  }
};
