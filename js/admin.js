const API_PRODUCTOS = 'api/productos.php';
const API_AUTH = 'api/auth.php';
const IMAGEN_MINIATURA_POR_DEFECTO = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&q=80';
const DIAS_POR_VENCER = 3;
const COLUMNAS_TABLA = 7;

let inventario = [];

const tablaAdmin = document.getElementById('tabla-admin');
const formProducto = document.getElementById('form-producto');
const tituloForm = document.getElementById('titulo-form');
const btnCancelar = document.getElementById('btn-cancelar');
const errorForm = document.getElementById('error-form');
const campoId = document.getElementById('producto-id');

const campos = {
    nombre: document.getElementById('nombre'),
    categoria: document.getElementById('categoria'),
    lote: document.getElementById('lote'),
    precio: document.getElementById('precio'),
    stock: document.getElementById('stock'),
    fecha_vencimiento: document.getElementById('fecha_vencimiento'),
    imagen_url: document.getElementById('imagen_url'),
};

function irAlLogin() {
    window.location.href = 'login.html';
}

// Un 403 significa sesión vencida o ausente: se vuelve al login.
async function llamarApi(url, opciones = {}) {
    const respuesta = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...opciones,
    });
    if (respuesta.status === 403) {
        irAlLogin();
        throw new Error('Sesión no válida');
    }
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error || 'Error del servidor');
    return datos;
}

function mostrarError(mensaje) {
    errorForm.textContent = mensaje;
    errorForm.hidden = false;
}

function buscarProducto(id) {
    return inventario.find((producto) => producto.id === id);
}

function badgeEstado(producto) {
    const dias = Number(producto.dias_para_vencer);
    if (producto.stock <= 0) return '<span class="badge-tabla agotado">Agotado</span>';
    if (dias < 0) return `<span class="badge-tabla vencido">Vencido (${Math.abs(dias)}d)</span>`;
    if (dias <= DIAS_POR_VENCER) return `<span class="badge-tabla alerta">Por vencer (${dias}d)</span>`;
    return `<span class="badge-tabla fresco">Vigente (${dias}d)</span>`;
}

function mensajeEnTabla(texto) {
    tablaAdmin.innerHTML = `<tr><td colspan="${COLUMNAS_TABLA}" class="sin-datos">${esc(texto)}</td></tr>`;
}

function crearFila(producto) {
    const imagen = producto.imagen_url || IMAGEN_MINIATURA_POR_DEFECTO;
    const id = Number(producto.id);
    const fila = document.createElement('tr');
    fila.innerHTML = `
        <td>
            <div class="celda-producto">
                <img src="${esc(imagen)}" class="img-miniatura" alt="${esc(producto.nombre)}">
                <strong>${esc(producto.nombre)}</strong>
            </div>
        </td>
        <td>${esc(producto.categoria)}<br><small class="detalle-lote">Lote: ${esc(producto.lote)}</small></td>
        <td class="precio-tabla">${formatoMoneda(producto.precio)}</td>
        <td>${producto.stock > 0 ? esc(producto.stock) : '<strong class="stock-agotado">0</strong>'}</td>
        <td>${esc(producto.fecha_vencimiento)}</td>
        <td>${badgeEstado(producto)}</td>
        <td>
            <button type="button" class="btn btn-accion btn-editar" data-accion="editar" data-id="${id}"
                    aria-label="Editar ${esc(producto.nombre)}" title="Editar">✏️</button>
            <button type="button" class="btn btn-accion btn-peligro" data-accion="eliminar" data-id="${id}"
                    aria-label="Eliminar ${esc(producto.nombre)}" title="Eliminar">🗑️</button>
        </td>`;
    return fila;
}

function renderizarTabla() {
    tablaAdmin.innerHTML = '';

    if (inventario.length === 0) {
        mensajeEnTabla('No hay productos registrados.');
        return;
    }

    inventario.forEach((producto) => tablaAdmin.appendChild(crearFila(producto)));
}

async function cargarInventario() {
    try {
        inventario = await llamarApi(`${API_PRODUCTOS}?todos=1`);
        renderizarTabla();
    } catch (error) {
        mensajeEnTabla(error.message);
    }
}

function leerFormulario() {
    return {
        nombre: campos.nombre.value,
        categoria: campos.categoria.value,
        lote: campos.lote.value,
        precio: parseFloat(campos.precio.value),
        stock: parseInt(campos.stock.value, 10),
        fecha_vencimiento: campos.fecha_vencimiento.value,
        imagen_url: campos.imagen_url.value,
    };
}

function resetearFormulario() {
    formProducto.reset();
    campoId.value = '';
    tituloForm.textContent = '➕ Registrar Producto';
    btnCancelar.hidden = true;
    errorForm.hidden = true;
}

async function guardarProducto(evento) {
    evento.preventDefault();
    errorForm.hidden = true;

    const id = campoId.value;
    try {
        await llamarApi(id ? `${API_PRODUCTOS}?id=${encodeURIComponent(id)}` : API_PRODUCTOS, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(leerFormulario()),
        });
        resetearFormulario();
        await cargarInventario();
    } catch (error) {
        mostrarError(error.message);
    }
}

function prepararEdicion(id) {
    const producto = buscarProducto(id);
    if (!producto) return;

    campoId.value = producto.id;
    campos.nombre.value = producto.nombre;
    campos.categoria.value = producto.categoria;
    campos.lote.value = producto.lote;
    campos.precio.value = producto.precio;
    campos.stock.value = producto.stock;
    campos.fecha_vencimiento.value = producto.fecha_vencimiento;
    campos.imagen_url.value = producto.imagen_url || '';

    tituloForm.textContent = `✏️ Editando: ${producto.nombre}`;
    btnCancelar.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarProducto(id) {
    const producto = buscarProducto(id);
    if (!producto) return;
    if (!confirm(`¿Eliminar permanentemente "${producto.nombre}" (Lote: ${producto.lote})?`)) return;

    try {
        await llamarApi(`${API_PRODUCTOS}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (Number(campoId.value) === id) resetearFormulario();
        await cargarInventario();
    } catch (error) {
        alert(error.message);
    }
}

async function cerrarSesion() {
    await fetch(`${API_AUTH}?accion=logout`, { method: 'POST' });
    irAlLogin();
}

function atenderClicEnTabla(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;

    const id = Number(boton.dataset.id);
    if (boton.dataset.accion === 'editar') prepararEdicion(id);
    else eliminarProducto(id);
}

async function iniciar() {
    try {
        const { autenticado } = await (await fetch(API_AUTH)).json();
        if (!autenticado) return irAlLogin();
        cargarInventario();
    } catch (error) {
        irAlLogin();
    }
}

formProducto.addEventListener('submit', guardarProducto);
tablaAdmin.addEventListener('click', atenderClicEnTabla);
btnCancelar.addEventListener('click', resetearFormulario);
document.getElementById('btn-logout').addEventListener('click', cerrarSesion);

iniciar();
