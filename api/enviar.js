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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

  const submittedAt = new Date().toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const patientName = `${nombre} ${apellido}`.trim();
  const subject = `Solicitud de cita de ${patientName} - ${submittedAt}`;
  const text = [
    'Nueva solicitud de cita',
    '',
    'Nota: este mensaje fue generado desde el formulario del sitio web.',
    'Para coordinar la cita, comuníquese directamente con el paciente usando los datos indicados abajo.',
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
  const html = `
    <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.5;">
      <h2 style="margin: 0 0 16px; color: #172554;">Nueva solicitud de cita</h2>
      <div style="border-left: 4px solid #1e3a8a; background: #f8fafc; padding: 12px 14px; margin-bottom: 18px;">
        <strong>Nota:</strong> este mensaje fue generado desde el formulario del sitio web.<br>
        Para coordinar la cita, comuníquese directamente con el paciente usando los datos indicados abajo.
      </div>
      <p><strong>Nombre:</strong> ${escapeHtml(patientName)}</p>
      <p><strong>Telefono:</strong> ${escapeHtml(telefono)}</p>
      <p><strong>Correo:</strong> ${escapeHtml(correo || 'No proporcionado')}</p>
      <p><strong>Especialidad:</strong> ${escapeHtml(especialidad)}</p>
      <p><strong>Mensaje:</strong></p>
      <p style="white-space: pre-wrap;">${escapeHtml(mensaje)}</p>
      <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 18px 0;">
      <p style="font-size: 12px; color: #71717a;">Enviado desde el sitio web de ${escapeHtml(CLINIC_NAME)} el ${escapeHtml(submittedAt)}.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${CLINIC_NAME}" <${process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO,
      replyTo: correo || process.env.SMTP_USER,
      subject,
      text,
      html
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mail send failed:', error);
    res.status(500).json({ success: false, error: 'No se pudo enviar el correo' });
  }
};
