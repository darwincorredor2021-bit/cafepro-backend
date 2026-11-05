// =====================================================================
// controllers/NoticiasController.js — Noticias del sector cafetero
// Lee un feed RSS (formato estándar con el que los sitios publican sus
// titulares) de Google Noticias con la búsqueda "café Colombia" y entrega
// al frontend las noticias más recientes ya simplificadas.
// =====================================================================

const Parser = require('rss-parser');

// Feed RSS de Google Noticias: búsqueda "cafe colombia", en español, para Colombia.
const URL_NOTICIAS = 'https://news.google.com/rss/search?q=cafe+colombia&hl=es-419&gl=CO&ceid=CO:es-419';

// Cuántas noticias se envían al frontend.
const CANTIDAD_NOTICIAS = 6;

class NoticiasController {
  constructor() {
    // El "parser" descarga el feed RSS y lo convierte en objetos de JavaScript.
    this.parser = new Parser();
  }

  /**
   * GET /api/noticias
   * Descarga el feed y responde con una lista de noticias:
   * { ok: true, noticias: [{ titulo, enlace, fecha, fuente }, ...] }
   * Si el feed no se puede consultar, responde 500 con ok:false y un mensaje.
   */
  async obtener(req, res) {
    try {
      const feed = await this.parser.parseURL(URL_NOTICIAS);

      // Solo se toman las primeras noticias y de cada una se conservan los
      // campos que usa la interfaz.
      const noticias = feed.items.slice(0, CANTIDAD_NOTICIAS).map(item => ({
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
  }
}

module.exports = NoticiasController;
