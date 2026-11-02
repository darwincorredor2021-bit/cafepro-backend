const obtenerPrecioCafé = async (req, res) => {
    try {
        const precioOficialCarga = 2080000; 

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