-- Base de datos: tienda_perecederos (la crea docker-compose con POSTGRES_DB)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL, -- Lácteos, Cárnicos, Frutas y Verduras, Panadería
    lote VARCHAR(30) NOT NULL,
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    stock INTEGER NOT NULL CHECK (stock >= 0),
    fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    imagen_url VARCHAR(255) DEFAULT 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'
);

CREATE TABLE usuarios_admin (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);

-- Usuario de prueba: admin / Admin123!  (bcrypt; PHP lo verifica con password_verify)
INSERT INTO usuarios_admin (usuario, password_hash)
VALUES ('admin', crypt('Admin123!', gen_salt('bf')));

-- Datos de prueba (frescos, uno por vencer en 2 días y uno ya vencido)
INSERT INTO productos (nombre, categoria, lote, precio, stock, fecha_vencimiento, imagen_url) VALUES
('Leche Entera Pasteurizada 1L', 'Lácteos', 'LT-2026-01', 4200.00, 35, CURRENT_DATE + INTERVAL '12 days', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400'),
('Queso Campesino Fresco 500g', 'Lácteos', 'LT-2026-02', 11500.00, 8, CURRENT_DATE + INTERVAL '2 days', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400'),
('Pechuga de Pollo Orgánica 1Kg', 'Cárnicos', 'CR-2026-88', 18900.00, 15, CURRENT_DATE + INTERVAL '5 days', 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400'),
('Fresas Seleccionadas 500g', 'Frutas y Verduras', 'FV-2026-10', 6800.00, 20, CURRENT_DATE + INTERVAL '3 days', 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400'),
('Yogurt Griego Natural (VENCIDO)', 'Lácteos', 'LT-2025-99', 8500.00, 5, CURRENT_DATE - INTERVAL '2 days', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400');
