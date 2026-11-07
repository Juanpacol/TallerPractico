// Panel administrativo: protege la vista y ejecuta el CRUD contra api/productos.php.
const API = 'api/productos.php';
let inventario = [];

const tablaAdmin = document.getElementById('tabla-admin');
const formProducto = document.getElementById('form-producto');
const tituloForm = document.getElementById('titulo-form');
const btnCancelar = document.getElementById('btn-cancelar');
const errorForm = document.getElementById('error-form');

const formatoMoneda = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

// Escapa texto de la base de datos antes de insertarlo como HTML (evita XSS).
const esc = (texto) =>
    String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function irAlLogin() {
    window.location.href = 'login.html';
}

// Llamada a la API: si el servidor responde 403, la sesión caducó y se vuelve al login.
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

function badgeEstado(p) {
    const dias = Number(p.dias_para_vencer);
    if (p.stock <= 0) return '<span class="badge-tabla agotado">Agotado</span>';
    if (dias < 0) return `<span class="badge-tabla vencido">Vencido (${Math.abs(dias)}d)</span>`;
    if (dias <= 3) return `<span class="badge-tabla alerta">Por vencer (${dias}d)</span>`;
    return `<span class="badge-tabla fresco">Vigente (${dias}d)</span>`;
}

// READ
function renderizarTabla() {
    tablaAdmin.innerHTML = '';

    if (inventario.length === 0) {
        tablaAdmin.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem;">No hay productos registrados.</td></tr>';
        return;
    }

    inventario.forEach((p) => {
        const imagen = p.imagen_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&q=80';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="celda-producto">
                    <img src="${esc(imagen)}" class="img-miniatura" alt="${esc(p.nombre)}">
                    <strong>${esc(p.nombre)}</strong>
                </div>
            </td>
            <td>${esc(p.categoria)}<br><small style="color:#666;">Lote: ${esc(p.lote)}</small></td>
            <td style="font-weight:600; color:var(--verde-primario);">${formatoMoneda(p.precio)}</td>
            <td>${p.stock > 0 ? esc(p.stock) : '<strong style="color:var(--peligro)">0</strong>'}</td>
            <td>${esc(p.fecha_vencimiento)}</td>
            <td>${badgeEstado(p)}</td>
            <td>
                <button class="btn btn-accion btn-editar" data-accion="editar" data-id="${Number(p.id)}">✏️</button>
                <button class="btn btn-accion btn-peligro" data-accion="eliminar" data-id="${Number(p.id)}">🗑️</button>
            </td>`;
        tablaAdmin.appendChild(tr);
    });
}

async function cargarInventario() {
    try {
        inventario = await llamarApi(`${API}?todos=1`);
        renderizarTabla();
    } catch (error) {
        tablaAdmin.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem;">${esc(error.message)}</td></tr>`;
    }
}

// CREATE / UPDATE
formProducto.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorForm.hidden = true;

    const id = document.getElementById('producto-id').value;
    const producto = {
        nombre: document.getElementById('nombre').value,
        categoria: document.getElementById('categoria').value,
        lote: document.getElementById('lote').value,
        precio: parseFloat(document.getElementById('precio').value),
        stock: parseInt(document.getElementById('stock').value, 10),
        fecha_vencimiento: document.getElementById('fecha_vencimiento').value,
        imagen_url: document.getElementById('imagen_url').value,
    };

    try {
        await llamarApi(id ? `${API}?id=${encodeURIComponent(id)}` : API, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(producto),
        });
        resetearFormulario();
        await cargarInventario();
    } catch (error) {
        mostrarError(error.message);
    }
});

function prepararEdicion(id) {
    const p = inventario.find((item) => item.id === id);
    if (!p) return;

    document.getElementById('producto-id').value = p.id;
    document.getElementById('nombre').value = p.nombre;
    document.getElementById('categoria').value = p.categoria;
    document.getElementById('lote').value = p.lote;
    document.getElementById('precio').value = p.precio;
    document.getElementById('stock').value = p.stock;
    document.getElementById('fecha_vencimiento').value = p.fecha_vencimiento;
    document.getElementById('imagen_url').value = p.imagen_url || '';

    tituloForm.textContent = `✏️ Editando: ${p.nombre}`;
    btnCancelar.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// DELETE
async function eliminarProducto(id) {
    const p = inventario.find((item) => item.id === id);
    if (!p) return;
    if (!confirm(`¿Eliminar permanentemente "${p.nombre}" (Lote: ${p.lote})?`)) return;

    try {
        await llamarApi(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (Number(document.getElementById('producto-id').value) === id) resetearFormulario();
        await cargarInventario();
    } catch (error) {
        alert(error.message);
    }
}

function resetearFormulario() {
    formProducto.reset();
    document.getElementById('producto-id').value = '';
    tituloForm.textContent = '➕ Registrar Producto';
    btnCancelar.hidden = true;
    errorForm.hidden = true;
}

tablaAdmin.addEventListener('click', (e) => {
    const boton = e.target.closest('button[data-accion]');
    if (!boton) return;
    const id = Number(boton.dataset.id);
    if (boton.dataset.accion === 'editar') prepararEdicion(id);
    else eliminarProducto(id);
});

btnCancelar.addEventListener('click', resetearFormulario);

document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('api/auth.php?accion=logout', { method: 'POST' });
    irAlLogin();
});

// Protege la vista: sin sesión se vuelve al login.
(async function iniciar() {
    try {
        const { autenticado } = await (await fetch('api/auth.php')).json();
        if (!autenticado) return irAlLogin();
        cargarInventario();
    } catch (error) {
        irAlLogin();
    }
})();
