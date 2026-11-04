const axios = require('axios');
const BaseController = require('./BaseController');

// =====================================================================
// 1. DATOS FIJOS DEL CÁLCULO (puedes ajustarlos aquí)
// =====================================================================

// Una carga son 125 kg de café PERGAMINO SECO (como lo vende el caficultor).
const KG_CARGA = 125;

// La bolsa de Nueva York cotiza café ya trillado (excelso), no pergamino.
// La Federación usa el "factor de rendimiento" (FR): con 94 kg de pergamino
// se obtienen 70 kg de café excelso. Por eso 125 kg de pergamino NO equivalen
// a 125 kg de café excelso.
const KG_EXCELSO_BASE = 70;
const FACTOR_RENDIMIENTO = 94;

// Conversión de unidades: la bolsa cotiza en centavos de dólar por LIBRA.
const LIBRAS_POR_KG = 2.20462;

// El café colombiano se paga con un diferencial (prima) sobre la bolsa, menos
// costos de exportación. Este valor (centavos de dólar por libra) es una
// aproximación calibrada con precios publicados por la FNC en octubre de 2026.
const DIFERENCIAL_CENTAVOS = 27;

// La FNC publica el precio redondeado de 5.000 en 5.000 pesos.
const REDONDEO_COP = 5000;

// Valores de RESPALDO por si las APIs externas fallan (fecha: 30 oct 2026).
// Puedes cambiarlos sin tocar el código con las variables BOLSA_RESPALDO y
// TRM_RESPALDO en tu archivo .env (o en Render).
const RESPALDO = {
  bolsaCentavos: Number(process.env.BOLSA_RESPALDO) || 287.2,
  trm: Number(process.env.TRM_RESPALDO) || 3166.91,
  fecha: '30 de octubre de 2026'
};

// Direcciones de las APIs externas
const URL_TRM = 'https://www.datos.gov.co/resource/32sa-8pi3.json';
const URL_TASAS_USD = 'https://open.er-api.com/v6/latest/USD';
const URL_BOLSA = 'https://query1.finance.yahoo.com/v8/finance/chart/KC=F';

const TIEMPO_ESPERA_MS = 8000;           // si una API no responde en 8 s, la abandonamos
const CACHE_NORMAL_MS = 15 * 60 * 1000;  // datos reales: se reutilizan 15 minutos
const CACHE_RESPALDO_MS = 2 * 60 * 1000; // datos de respaldo: reintentamos pronto

// =====================================================================
// 2. LA CLASE
// =====================================================================
class PrecioController extends BaseController {
  constructor() {
    super();
    // "Caché": memoria donde guardamos la última respuesta para no llamar a las
    // APIs externas en cada visita (son gratis, pero tienen límites de uso).
    this.cache = null; // { datos, expiraEn }
  }

  // ---------------------------------------------------------------
  // PASO A: obtener la TRM (pesos por dólar)
  // ---------------------------------------------------------------
  async obtenerTRM() {
    // Fuente 1: TRM oficial (Superintendencia Financiera, vía datos.gov.co)
    try {
      // Fecha de hoy en Colombia, formato AAAA-MM-DD
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

      const { data } = await axios.get(URL_TRM, {
        params: {
          $where: `vigenciadesde <= '${hoy}'`, // TRM que ya empezó a regir...
          $order: 'vigenciadesde DESC',        // ...la más reciente primero
          $limit: 1                            // solo necesitamos una
        },
        timeout: TIEMPO_ESPERA_MS
      });

      const valor = Number(data && data[0] && data[0].valor);
      if (valor > 1000 && valor < 10000) {
        return { valor, fuente: 'TRM oficial (datos.gov.co)', esRespaldo: false };
      }
      throw new Error('La respuesta no trajo una TRM válida');
    } catch (error) {
      console.warn('[Precio] Falló la TRM oficial:', error.message);
    }

    // Fuente 2: tasa de cambio general (se actualiza una vez al día)
    try {
      const { data } = await axios.get(URL_TASAS_USD, { timeout: TIEMPO_ESPERA_MS });
      const valor = Number(data && data.rates && data.rates.COP);
      if (valor > 1000 && valor < 10000) {
        return { valor, fuente: 'ExchangeRate-API (exchangerate-api.com)', esRespaldo: false };
      }
      throw new Error('La respuesta no trajo la tasa COP');
    } catch (error) {
      console.warn('[Precio] Falló la tasa de cambio alterna:', error.message);
    }

    // Respaldo final: valor fijo
    return {
      valor: RESPALDO.trm,
      fuente: `Valor de respaldo (${RESPALDO.fecha})`,
      esRespaldo: true
    };
  }

  // ---------------------------------------------------------------
  // PASO B: obtener la bolsa de Nueva York (centavos de dólar por libra)
  // ---------------------------------------------------------------
  async obtenerBolsa() {
    try {
      const { data } = await axios.get(URL_BOLSA, {
        params: { interval: '1d', range: '5d' },
        // Algunos servicios rechazan peticiones sin "User-Agent"
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: TIEMPO_ESPERA_MS
      });

      const resultado = data && data.chart && data.chart.result && data.chart.result[0];
      const centavos = Number(resultado && resultado.meta && resultado.meta.regularMarketPrice);

      // Validación: el café suele cotizar entre 50 y 1000 centavos por libra
      if (centavos > 50 && centavos < 1000) {
        return { centavos, fuente: 'ICE Nueva York, contrato "C" (Yahoo Finance)', esRespaldo: false };
      }
      throw new Error('La respuesta no trajo un precio válido');
    } catch (error) {
      console.warn('[Precio] Falló la bolsa de Nueva York:', error.message);
    }

    return {
      centavos: RESPALDO.bolsaCentavos,
      fuente: `Valor de respaldo (${RESPALDO.fecha})`,
      esRespaldo: true
    };
  }

  // ---------------------------------------------------------------
  // PASO C: la fórmula matemática (no consulta internet, solo calcula)
  // ---------------------------------------------------------------
  calcularCarga(bolsaCentavos, trm) {
    // 1. ¿Cuánto café excelso sale de una carga de 125 kg de pergamino?
    //    125 x 70 / 94 = 93,09 kg
    const kgExcelso = (KG_CARGA * KG_EXCELSO_BASE) / FACTOR_RENDIMIENTO;

    // 2. Pasar esos kilos a libras (la bolsa cotiza por libra)
    const libras = kgExcelso * LIBRAS_POR_KG;

    // 3. Precio por libra en DÓLARES: (bolsa + diferencial) / 100, porque están en centavos
    const dolaresPorLibra = (bolsaCentavos + DIFERENCIAL_CENTAVOS) / 100;

    // 4. Valor de la carga en dólares y luego en pesos
    const valorUSD = libras * dolaresPorLibra;
    const valorCOP = valorUSD * trm;

    // 5. Redondear de 5.000 en 5.000, como publica la FNC
    const precioCarga = Math.round(valorCOP / REDONDEO_COP) * REDONDEO_COP;

    return {
      kgExcelso: Number(kgExcelso.toFixed(2)),
      libras: Number(libras.toFixed(2)),
      dolaresPorLibra: Number(dolaresPorLibra.toFixed(4)),
      valorUSD: Number(valorUSD.toFixed(2)),
      precioCarga
    };
  }

  // Junta todo: consulta las dos fuentes al tiempo y calcula
  async calcularPrecio() {
    // Promise.all lanza ambas consultas a la vez (más rápido que una tras otra)
    const [trm, bolsa] = await Promise.all([this.obtenerTRM(), this.obtenerBolsa()]);
    const calculo = this.calcularCarga(bolsa.centavos, trm.valor);
    const esRespaldo = bolsa.esRespaldo || trm.esRespaldo;

    return {
      precioCarga: calculo.precioCarga,
      precioPorKg: Math.round(calculo.precioCarga / KG_CARGA),
      moneda: 'COP',
      unidad: `Carga de ${KG_CARGA} kg de café pergamino seco`,
      esEstimado: true,
      esRespaldo,
      actualizado: new Date().toISOString(),
      detalle: {
        bolsa: { centavosPorLibra: bolsa.centavos, fuente: bolsa.fuente, esRespaldo: bolsa.esRespaldo },
        trm: { valor: trm.valor, fuente: trm.fuente, esRespaldo: trm.esRespaldo },
        diferencialCentavos: DIFERENCIAL_CENTAVOS,
        factorRendimiento: FACTOR_RENDIMIENTO,
        kgExcelso: calculo.kgExcelso,
        libras: calculo.libras,
        dolaresPorLibra: calculo.dolaresPorLibra,
        valorUSD: calculo.valorUSD
      },
      aviso: 'Valor estimado a partir de la bolsa de Nueva York y la TRM. El precio oficial de compra lo publica la Federación Nacional de Cafeteros.'
    };
  }

  // ---------------------------------------------------------------
  // MÉTODO QUE ATIENDE LA PETICIÓN: GET /api/precio
  // ---------------------------------------------------------------
  async obtener(req, res) {
    try {
      // Si hay datos recientes guardados, los devolvemos sin consultar de nuevo
      if (this.cache && Date.now() < this.cache.expiraEn) {
        return res.json(this.cache.datos);
      }

      const datos = await this.calcularPrecio();

      this.cache = {
        datos,
        expiraEn: Date.now() + (datos.esRespaldo ? CACHE_RESPALDO_MS : CACHE_NORMAL_MS)
      };

      res.json(datos);
    } catch (error) {
      this.manejarError(res, error);
    }
  }
}

module.exports = PrecioController;
