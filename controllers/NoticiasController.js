const Parser = require('rss-parser');
const parser = new Parser();

const obtenerNoticiasCafeteras = async (req, res) => {
    try {
        // Feed RSS de noticias de café en Colombia vía Google News
        const urlRSS = 'https://news.google.com/rss/search?q=cafe+colombia+federacion+cafeteros&hl=es-419&gl=CO&ceid=CO:es-419';
        const feed = await parser.parseURL(urlRSS);

        // Tomamos las 5 noticias más recientes
        const noticias = feed.items.slice(0, 5).map(item => ({
            titulo: item.title,
            enlace: item.link,
            fecha: new Date(item.pubDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }),
            fuente: item.source || 'Actualidad Cafetera'
        }));

        res.json({ ok: true, noticias });
    } catch (error) {
        console.error('Error al obtener noticias:', error);
        res.status(500).json({ ok: false, mensaje: 'No se pudieron obtener las noticias' });
    }
};

module.exports = { obtenerNoticiasCafeteras };