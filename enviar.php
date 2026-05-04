<?php
// ═══════════════════════════════════════════════
//  CONFIGURACIÓN — completar antes de subir
// ═══════════════════════════════════════════════
$destinatario   = 'TU_CORREO@TUDOMINIO.COM';  // correo que recibirá las citas
$remitente      = 'web@TUDOMINIO.COM';         // correo del mismo dominio (cPanel)
$nombre_clinica = 'Centro Médico ESMEIN';
// ═══════════════════════════════════════════════

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

$nombre       = strip_tags(trim($_POST['nombre']       ?? ''));
$apellido     = strip_tags(trim($_POST['apellido']     ?? ''));
$telefono     = strip_tags(trim($_POST['telefono']     ?? ''));
$correo       = filter_var(trim($_POST['correo']       ?? ''), FILTER_SANITIZE_EMAIL);
$especialidad = strip_tags(trim($_POST['especialidad'] ?? 'No especificada'));
$mensaje      = strip_tags(trim($_POST['mensaje']      ?? 'Sin mensaje'));

if (empty($nombre) || empty($apellido) || empty($telefono)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Faltan campos requeridos']);
    exit;
}

if (!empty($correo) && !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Correo electrónico inválido']);
    exit;
}

$asunto  = "Nueva Solicitud de Cita — {$nombre_clinica}";

$cuerpo  = "═══════════════════════════════════════\n";
$cuerpo .= " NUEVA SOLICITUD DE CITA\n";
$cuerpo .= "═══════════════════════════════════════\n\n";
$cuerpo .= "Nombre:        {$nombre} {$apellido}\n";
$cuerpo .= "Teléfono:      {$telefono}\n";
$cuerpo .= "Correo:        " . (!empty($correo) ? $correo : 'No proporcionado') . "\n";
$cuerpo .= "Especialidad:  {$especialidad}\n\n";
$cuerpo .= "Mensaje:\n{$mensaje}\n\n";
$cuerpo .= "───────────────────────────────────────\n";
$cuerpo .= "Enviado desde el sitio web de {$nombre_clinica}\n";

$reply_to = !empty($correo) ? $correo : $remitente;
$headers  = "From: {$nombre_clinica} <{$remitente}>\r\n";
$headers .= "Reply-To: {$reply_to}\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$enviado = mail($destinatario, $asunto, $cuerpo, $headers);

echo json_encode(['success' => $enviado]);
