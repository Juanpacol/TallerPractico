const DIAS_CONSUMO_RAPIDO = 3;

let productos = [];

const contenedorCatalogo = document.getElementById('catalogo-cliente');
const inputBuscador = document.getElementById('buscador');
const selectCategoria = document.getElementById('filtro-categoria');

function mostrarMensaje(titulo, detalle) {
    contenedorCatalogo.innerHTML = `
        <div class="estado-vacio">
            <h2>${esc(titulo)}</h2>
            <p>${esc(detalle)}</p>
        </div>`;
}

function crearTarjeta(producto) {
    const dias = Number(producto.dias_para_vencer);
    const urgente = dias <= DIAS_CONSUMO_RAPIDO;
    const claseBadge = urgente ? 'badge-alerta' : 'badge-fresco';
    const textoEstado = urgente ? `¡Consumo rápido! (${dias} días)` : `Fresco (${dias} días)`;

    const tarjeta = document.createElement('article');
    tarjeta.className = 'tarjeta-producto';
    tarjeta.innerHTML = `
        <div class="badge-contenedor">
            <span class="badge ${claseBadge}">${esc(textoEstado)}</span>
        </div>
        <div class="tarjeta-img-contenedor">
            <img src="${esc(producto.imagen_url)}" alt="${esc(producto.nombre)}" loading="lazy">
        </div>
        <div class="tarjeta-cuerpo">
            <div>
                <span class="categoria-label">${esc(producto.categoria)}</span>
                <h3 class="tarjeta-titulo">${esc(producto.nombre)}</h3>
                <div class="tarjeta-detalles">
                    Lote: <strong>${esc(producto.lote)}</strong><br>
                    Vence: ${esc(producto.fecha_vencimiento)}
                </div>
            </div>
            <div class="precio-contenedor">
                <span class="precio">${formatoMoneda(producto.precio)}</span>
                <span class="stock">${esc(producto.stock)} und.</span>
            </div>
        </div>`;
    return tarjeta;
}

function renderizarProductos(lista) {
    contenedorCatalogo.innerHTML = '';

    if (lista.length === 0) {
        mostrarMensaje('😕 No encontramos productos', 'Intenta con otros términos de búsqueda o selecciona otra categoría.');
        return;
    }

    lista.forEach((producto) => contenedorCatalogo.appendChild(crearTarjeta(producto)));
}

function filtrarCatalogo() {
    const texto = inputBuscador.value.toLowerCase().trim();
    const categoria = selectCategoria.value;

    renderizarProductos(
        productos.filter(
            (p) =>
                p.nombre.toLowerCase().includes(texto) &&
                (categoria === 'Todas' || p.categoria === categoria)
        )
    );
}

async function cargarProductos() {
    try {
        const respuesta = await fetch('api/productos.php');
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        productos = await respuesta.json();
        filtrarCatalogo();
    } catch (error) {
        mostrarMensaje('⚠️ No se pudo cargar el catálogo', 'Intenta de nuevo en unos minutos.');
    }
}

inputBuscador.addEventListener('input', filtrarCatalogo);
selectCategoria.addEventListener('change', filtrarCatalogo);
document.addEventListener('DOMContentLoaded', cargarProductos);
