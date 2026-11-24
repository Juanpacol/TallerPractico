<?php
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

function iniciarSesion(): never
{
    $datos = json_decode(file_get_contents('php://input'), true) ?? [];
    $usuario = trim((string)($datos['usuario'] ?? ''));
    $password = (string)($datos['password'] ?? '');

    $stmt = obtenerConexion()->prepare('SELECT id, password_hash FROM usuarios_admin WHERE usuario = :usuario');
    $stmt->execute([':usuario' => $usuario]);
    $admin = $stmt->fetch();

    if (!$admin || !password_verify($password, $admin['password_hash'])) {
        responderJson(401, ['error' => 'Usuario o contraseña incorrectos']);
    }

    session_regenerate_id(true);
    $_SESSION['admin_id'] = $admin['id'];
    responderJson(200, ['ok' => true]);
}

function cerrarSesion(): never
{
    $_SESSION = [];
    session_destroy();
    responderJson(200, ['ok' => true]);
}

if (basename($_SERVER['SCRIPT_NAME']) !== 'auth.php') {
    return;
}

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    responderJson(200, ['autenticado' => estaAutenticado()]);
}

if ($metodo !== 'POST') {
    responderJson(405, ['error' => 'Método no permitido']);
}

match ($_GET['accion'] ?? '') {
    'login' => iniciarSesion(),
    'logout' => cerrarSesion(),
    default => responderJson(400, ['error' => 'Acción no válida']),
};
