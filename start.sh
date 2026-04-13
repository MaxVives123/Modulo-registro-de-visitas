#!/bin/bash
echo "============================================"
echo "  Sistema de Registro de Visitas"
echo "  Iniciando servicios..."
echo "============================================"
echo ""

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker no está instalado."
    echo "Instala Docker desde: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Levantar servicios
echo "[1/3] Construyendo e iniciando contenedores..."
docker-compose up -d --build db app

echo ""
echo "[2/3] Esperando a que la base de datos esté lista..."
sleep 10

echo ""
echo "[3/3] Cargando datos de demostración..."
docker-compose run --rm seed

echo ""
echo "============================================"
echo "  Sistema listo!"
echo ""
echo "  URL: http://localhost:3000"
echo ""
echo "  Credenciales:"
echo "    Admin:     admin / admin123"
echo "    Recepción: recepcion / recepcion123"
echo ""
echo "  Para detener: docker-compose down"
echo "============================================"
