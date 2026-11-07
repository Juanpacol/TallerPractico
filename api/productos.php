<?php
// CRUD de productos.
//   GET    productos.php             público: solo productos NO vencidos
//   GET    productos.php?todos=1     admin: incluye vencidos (requiere sesión)
//   POST   productos.php             crear     (requiere sesión)
//   PUT    productos.php?id=N        actualizar (requiere sesión)
//   DELETE productos.php?id=N        eliminar   (requiere sesión)
require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/auth.php';

$pdo = obtenerConexion();
$metodo = $_SERVER['REQUEST_METHOD'];

const CATEGORIAS = ['Lácteos', 'Cárnicos', 'Frutas y Verduras', 'Panadería'];

function leerYValidar(): array
{
    $d = json_decode(file_get_contents('php://input'), true);
    if (!is_array($d)) {
        responderJson(400, ['error' => 'JSON inválido']);
    }

    $nombre = trim((string)($d['nombre'] ?? ''));
    $categoria = (string)($d['categoria'] ?? '');
    $lote = trim((string)($d['lote'] ?? ''));
    $precio = $d['precio'] ?? null;
    $stock = $d['stock'] ?? null;
    $fecha = (string)($d['fecha_vencimiento'] ?? '');
    $imagen = trim((string)($d['imagen_url'] ?? ''));

    if ($nombre === '' || strlen($nombre) > 100) {
        responderJson(422, ['error' => 'Nombre obligatorio (máx. 100 caracteres)']);
    }
    if (!in_array($categoria, CATEGORIAS, true)) {
        responderJson(422, ['error' => 'Categoría no válida']);
    }
    if ($lote === '' || strlen($lote) > 30) {
        responderJson(422, ['error' => 'Lote obligatorio (máx. 30 caracteres)']);
    }
    if (!is_numeric($precio) || $precio < 0 || $precio > 99999999) {
        responderJson(422, ['error' => 'Precio no válido']);
    }
    if (!is_numeric($stock) || (int)$stock != $stock || $stock < 0) {
        responderJson(422, ['error' => 'Stock no válido']);
    }
    $f = DateTime::createFromFormat('Y-m-d', $fecha);
    if (!$f || $f->format('Y-m-d') !== $fecha) {
        responderJson(422, ['error' => 'Fecha de vencimiento no válida']);
    }
    if ($imagen !== '' && (!filter_var($imagen, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $imagen) || strlen($imagen) > 255)) {
        responderJson(422, ['error' => 'URL de imagen no válida']);
    }

    return [
        ':nombre' => $nombre,
        ':categoria' => $categoria,
        ':lote' => $lote,
        ':precio' => $precio,
        ':stock' => (int)$stock,
        ':fecha' => $fecha,
        ':imagen' => $imagen !== '' ? $imagen : null,
    ];
}

function idDeLaUrl(): int
{
    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
    if ($id === false || $id === null || $id < 1) {
        responderJson(400, ['error' => 'ID no válido']);
    }
    return $id;
}

try {
    switch ($metodo) {
        case 'GET':
            $todos = isset($_GET['todos']);
            if ($todos) {
                exigirSesion();
            }
            $sql = 'SELECT id, nombre, categoria, lote, precio::float AS precio, stock,
                           fecha_ingreso, fecha_vencimiento, imagen_url,
                           (fecha_vencimiento - CURRENT_DATE) AS dias_para_vencer
                    FROM productos '
                . ($todos ? '' : 'WHERE fecha_vencimiento >= CURRENT_DATE ')
                . 'ORDER BY fecha_vencimiento ASC, id ASC';
            responderJson(200, $pdo->query($sql)->fetchAll());

        case 'POST':
            exigirSesion();
            $p = leerYValidar();
            $stmt = $pdo->prepare('INSERT INTO productos (nombre, categoria, lote, precio, stock, fecha_vencimiento, imagen_url)
                VALUES (:nombre, :categoria, :lote, :precio, :stock, :fecha,
                        COALESCE(:imagen, \'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400\'))
                RETURNING id');
            $stmt->execute($p);
            responderJson(201, ['id' => $stmt->fetchColumn()]);

        case 'PUT':
            exigirSesion();
            $id = idDeLaUrl();
            $p = leerYValidar();
            $p[':id'] = $id;
            $stmt = $pdo->prepare('UPDATE productos SET nombre = :nombre, categoria = :categoria, lote = :lote,
                precio = :precio, stock = :stock, fecha_vencimiento = :fecha,
                imagen_url = COALESCE(:imagen, \'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400\')
                WHERE id = :id');
            $stmt->execute($p);
            if ($stmt->rowCount() === 0) {
                responderJson(404, ['error' => 'Producto no encontrado']);
            }
            responderJson(200, ['ok' => true]);

        case 'DELETE':
            exigirSesion();
            $id = idDeLaUrl();
            $stmt = $pdo->prepare('DELETE FROM productos WHERE id = :id');
            $stmt->execute([':id' => $id]);
            if ($stmt->rowCount() === 0) {
                responderJson(404, ['error' => 'Producto no encontrado']);
            }
            responderJson(200, ['ok' => true]);

        default:
            responderJson(405, ['error' => 'Método no permitido']);
    }
} catch (PDOException $e) {
    responderJson(500, ['error' => 'Error en la base de datos']);
}
