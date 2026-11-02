const Parser = require('rss-parser');
const parser = new Parser();

const obtenerNoticiasCafeteras = async (req, res) => {
    try {
        // Feed RSS alternativo y limpio de noticias agrícolas generales
        const urlRSS = 'https://www.fao.org/agricola/news/rss/en/'; // O usa un feed directo de Google con formato seguro
        
        // Si prefieres usar Google News pero de forma segura:
        // const urlRSS = 'https://news.google.com/rss/search?q=cafe+colombia&hl=es-419&gl=CO&ceid=CO:es-419';
        
        const feed = await parser.parseURL('https://news.google.com/rss/search?q=cafe+colombia&hl=es-419&gl=CO&ceid=CO:es-419');

        const noticias = feed.items.slice(0, 6).map(item => ({
            titulo: item.title,
            enlace: item.link,
            fecha: item.pubDate 
                ? new Date(item.pubDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Reciente',
            fuente: item.source || 'Actualidad Cafetera'
        }));

        res.json({ ok: true, noticias });
    } catch (error) {
        console.error('Error al obtener noticias:', error);
        res.status(500).json({ ok: false, mensaje: 'No se pudieron consultar las noticias en vivo.' });
    }
};

module.exports = { obtenerNoticiasCafeteras };