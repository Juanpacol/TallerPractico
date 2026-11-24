<?php
require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/auth.php';

const CATEGORIAS = ['Lácteos', 'Cárnicos', 'Frutas y Verduras', 'Panadería'];
const IMAGEN_POR_DEFECTO = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400';

function leerYValidar(): array
{
    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos)) {
        responderJson(400, ['error' => 'JSON inválido']);
    }

    $nombre = trim((string)($datos['nombre'] ?? ''));
    $categoria = (string)($datos['categoria'] ?? '');
    $lote = trim((string)($datos['lote'] ?? ''));
    $precio = $datos['precio'] ?? null;
    $stock = $datos['stock'] ?? null;
    $fecha = (string)($datos['fecha_vencimiento'] ?? '');
    $imagen = trim((string)($datos['imagen_url'] ?? ''));

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

    $fechaValidada = DateTime::createFromFormat('Y-m-d', $fecha);
    if (!$fechaValidada || $fechaValidada->format('Y-m-d') !== $fecha) {
        responderJson(422, ['error' => 'Fecha de vencimiento no válida']);
    }

    $imagenEsValida = filter_var($imagen, FILTER_VALIDATE_URL)
        && preg_match('#^https?://#i', $imagen)
        && strlen($imagen) <= 255;
    if ($imagen !== '' && !$imagenEsValida) {
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

function listarProductos(PDO $pdo): never
{
    $incluirVencidos = isset($_GET['todos']);
    if ($incluirVencidos) {
        exigirSesion();
    }

    $filtroVigentes = $incluirVencidos ? '' : 'WHERE fecha_vencimiento >= CURRENT_DATE';
    $consulta = "SELECT id, nombre, categoria, lote, precio::float AS precio, stock,
                        fecha_ingreso, fecha_vencimiento, imagen_url,
                        (fecha_vencimiento - CURRENT_DATE) AS dias_para_vencer
                 FROM productos
                 $filtroVigentes
                 ORDER BY fecha_vencimiento ASC, id ASC";

    responderJson(200, $pdo->query($consulta)->fetchAll());
}

function crearProducto(PDO $pdo): never
{
    exigirSesion();
    $producto = leerYValidar();
    $producto[':imagen'] ??= IMAGEN_POR_DEFECTO;

    $stmt = $pdo->prepare(
        'INSERT INTO productos (nombre, categoria, lote, precio, stock, fecha_vencimiento, imagen_url)
         VALUES (:nombre, :categoria, :lote, :precio, :stock, :fecha, :imagen)
         RETURNING id'
    );
    $stmt->execute($producto);
    responderJson(201, ['id' => $stmt->fetchColumn()]);
}

function actualizarProducto(PDO $pdo): never
{
    exigirSesion();
    $id = idDeLaUrl();
    $producto = leerYValidar();
    $producto[':id'] = $id;

    // Sin imagen nueva, COALESCE conserva la que ya tenía el producto.
    $stmt = $pdo->prepare(
        'UPDATE productos
         SET nombre = :nombre, categoria = :categoria, lote = :lote, precio = :precio,
             stock = :stock, fecha_vencimiento = :fecha, imagen_url = COALESCE(:imagen, imagen_url)
         WHERE id = :id'
    );
    $stmt->execute($producto);

    responderSegunFilasAfectadas($stmt);
}

function eliminarProducto(PDO $pdo): never
{
    exigirSesion();
    $id = idDeLaUrl();

    $stmt = $pdo->prepare('DELETE FROM productos WHERE id = :id');
    $stmt->execute([':id' => $id]);

    responderSegunFilasAfectadas($stmt);
}

function responderSegunFilasAfectadas(PDOStatement $stmt): never
{
    if ($stmt->rowCount() === 0) {
        responderJson(404, ['error' => 'Producto no encontrado']);
    }
    responderJson(200, ['ok' => true]);
}

$pdo = obtenerConexion();

try {
    match ($_SERVER['REQUEST_METHOD']) {
        'GET' => listarProductos($pdo),
        'POST' => crearProducto($pdo),
        'PUT' => actualizarProducto($pdo),
        'DELETE' => eliminarProducto($pdo),
        default => responderJson(405, ['error' => 'Método no permitido']),
    };
} catch (PDOException $e) {
    responderJson(500, ['error' => 'Error en la base de datos']);
}
