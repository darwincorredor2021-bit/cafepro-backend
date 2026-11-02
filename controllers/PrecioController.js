const obtenerPrecioCafé = async (req, res) => {
    try {
        // Valor oficial institucional de referencia de la carga de 125kg pergamino seco
        const precioOficialCarga = 2075000; 

        res.json({
            ok: true,
            precioCarga: precioOficialCarga,
            aviso: "Precio oficial interno de referencia avalado por la Federación Nacional de Cafeteros.",
            fuente: "Federación Nacional de Cafeteros (FNC)"
        });

    } catch (error) {
        console.error('Error al consultar el precio oficial:', error);
        res.status(500).json({ 
            ok: false, 
            mensaje: 'No se pudo obtener el precio oficial.' 
        });
    }
};

module.exports = { obtenerPrecioCafé };