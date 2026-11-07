<?php
// Inicio/cierre de sesión y verificación.
//   GET  auth.php            -> {autenticado: bool}
//   POST auth.php?accion=login   (JSON: usuario, password)
//   POST auth.php?accion=logout
require_once __DIR__ . '/conexion.php';

session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
session_start();

function estaAutenticado(): bool
{
    return !empty($_SESSION['admin_id']);
}

function exigirSesion(): void
{
    if (!estaAutenticado()) {
        responderJson(403, ['error' => 'No autorizado']);
    }
}

// Solo responde cuando se llama directamente; productos.php lo incluye solo por las funciones.
if (basename($_SERVER['SCRIPT_NAME']) !== 'auth.php') {
    return;
}

$metodo = $_SERVER['REQUEST_METHOD'];
$accion = $_GET['accion'] ?? '';

if ($metodo === 'GET') {
    responderJson(200, ['autenticado' => estaAutenticado()]);
}

if ($metodo !== 'POST') {
    responderJson(405, ['error' => 'Método no permitido']);
}

if ($accion === 'logout') {
    $_SESSION = [];
    session_destroy();
    responderJson(200, ['ok' => true]);
}

if ($accion === 'login') {
    $datos = json_decode(file_get_contents('php://input'), true) ?? [];
    $usuario = trim((string)($datos['usuario'] ?? ''));
    $password = (string)($datos['password'] ?? '');

    $stmt = obtenerConexion()->prepare('SELECT id, password_hash FROM usuarios_admin WHERE usuario = :u');
    $stmt->execute([':u' => $usuario]);
    $fila = $stmt->fetch();

    if (!$fila || !password_verify($password, $fila['password_hash'])) {
        responderJson(401, ['error' => 'Usuario o contraseña incorrectos']);
    }

    session_regenerate_id(true);
    $_SESSION['admin_id'] = $fila['id'];
    responderJson(200, ['ok' => true]);
}

responderJson(400, ['error' => 'Acción no válida']);
