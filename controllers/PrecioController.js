// =====================================================================
// controllers/PrecioController.js — Precio estimado de la carga de café
// Calcula cuánto vale una carga (125 kg de café pergamino seco) en pesos
// colombianos, a partir de dos datos de mercado en tiempo real:
//   1. La TRM (pesos por dólar).
//   2. El precio de la bolsa de Nueva York (centavos de dólar por libra).
// Si alguna fuente externa falla, usa valores de respaldo para que la
// aplicación nunca se quede sin precio. El resultado es una ESTIMACIÓN:
// el precio oficial de compra lo publica la Federación Nacional de Cafeteros.
// =====================================================================

const axios = require('axios');
const BaseController = require('./BaseController');

// ---------------------------------------------------------------------
// 1. DATOS FIJOS DEL CÁLCULO
// Son constantes: valores que no cambian mientras el programa corre.
// ---------------------------------------------------------------------

// Una carga son 125 kg de café PERGAMINO SECO (como lo vende el caficultor).
const KG_CARGA = 125;

// La bolsa de Nueva York cotiza café ya trillado (excelso), no pergamino.
// La Federación usa el "factor de rendimiento" (FR): con 94 kg de pergamino
// se obtienen 70 kg de café excelso. Por eso 125 kg de pergamino NO equivalen
// a 125 kg de café excelso.
const KG_EXCELSO_BASE = 70;
const FACTOR_RENDIMIENTO = 94;

// La bolsa cotiza por LIBRA, así que los kilos se convierten a libras.
const LIBRAS_POR_KG = 2.20462;

// Diferencial (prima) del café colombiano sobre la bolsa, ya descontados los
// costos de exportación, en centavos de dólar por libra. Es una aproximación
// calibrada con precios publicados por la FNC en octubre de 2026; si el
// estimado se aleja del precio oficial, este es el valor que se ajusta.
const DIFERENCIAL_CENTAVOS = 27;

// La FNC publica el precio redondeado de 5.000 en 5.000 pesos.
const REDONDEO_COP = 5000;

// Valores de RESPALDO (del 30 de octubre de 2026) por si las APIs externas
// fallan. Se pueden cambiar sin tocar el código con las variables de entorno
// BOLSA_RESPALDO y TRM_RESPALDO.
const RESPALDO = {
  bolsaCentavos: Number(process.env.BOLSA_RESPALDO) || 287.2,
  trm: Number(process.env.TRM_RESPALDO) || 3166.91,
  fecha: '30 de octubre de 2026'
};

// Direcciones de las APIs externas.
const URL_TRM = 'https://www.datos.gov.co/resource/32sa-8pi3.json';   // TRM oficial (datos abiertos de Colombia)
const URL_TASAS_USD = 'https://open.er-api.com/v6/latest/USD';         // tasas de cambio generales
const URL_BOLSA = 'https://query1.finance.yahoo.com/v8/finance/chart/KC=F'; // café "C" de la bolsa ICE de Nueva York

// Tiempos de espera y de caché.
const TIEMPO_ESPERA_MS = 8000;           // si una API no responde en 8 s, se abandona
const CACHE_NORMAL_MS = 15 * 60 * 1000;  // datos reales: se reutilizan 15 minutos
const CACHE_RESPALDO_MS = 2 * 60 * 1000; // datos de respaldo: se reintenta pronto

// ---------------------------------------------------------------------
// 2. LA CLASE
// ---------------------------------------------------------------------
class PrecioController extends BaseController {
  constructor() {
    super();
    // Caché: memoria donde se guarda la última respuesta para no llamar a las
    // APIs externas en cada visita (son gratuitas y tienen límites de uso).
    this.cache = null; // { datos, expiraEn }
  }

  /**
   * Obtiene la TRM (pesos colombianos por cada dólar).
   * Prueba tres fuentes en orden y se queda con la primera que funcione:
   *   1. TRM oficial (datos.gov.co).
   *   2. Tasa de cambio general (ExchangeRate-API).
   *   3. Valor de respaldo fijo.
   *
   * @returns {Promise<{valor:number, fuente:string, esRespaldo:boolean}>}
   */
  async obtenerTRM() {
    // Fuente 1: TRM oficial publicada por la Superintendencia Financiera.
    try {
      // Fecha de hoy en Colombia, con formato AAAA-MM-DD.
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

      const { data } = await axios.get(URL_TRM, {
        params: {
          $where: `vigenciadesde <= '${hoy}'`, // solo TRM que ya empezaron a regir...
          $order: 'vigenciadesde DESC',        // ...la más reciente primero
          $limit: 1                            // solo se necesita una
        },
        timeout: TIEMPO_ESPERA_MS
      });

      const valor = Number(data && data[0] && data[0].valor);
      // Validación: la TRM colombiana es un número de miles de pesos.
      if (valor > 1000 && valor < 10000) {
        return { valor, fuente: 'TRM oficial (datos.gov.co)', esRespaldo: false };
      }
      throw new Error('La respuesta no trajo una TRM válida');
    } catch (error) {
      console.warn('[Precio] Falló la TRM oficial:', error.message);
    }

    // Fuente 2: tasa de cambio general (se actualiza una vez al día).
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

    // Fuente 3: valor fijo, para que el cálculo siempre pueda continuar.
    return {
      valor: RESPALDO.trm,
      fuente: `Valor de respaldo (${RESPALDO.fecha})`,
      esRespaldo: true
    };
  }

  /**
   * Obtiene el precio del café en la bolsa de Nueva York, en centavos de
   * dólar por libra. Si la consulta falla o el dato no parece válido,
   * devuelve el valor de respaldo.
   *
   * @returns {Promise<{centavos:number, fuente:string, esRespaldo:boolean}>}
   */
  async obtenerBolsa() {
    try {
      const { data } = await axios.get(URL_BOLSA, {
        params: { interval: '1d', range: '5d' },
        // Algunos servicios rechazan las peticiones que no traen "User-Agent".
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: TIEMPO_ESPERA_MS
      });

      const resultado = data && data.chart && data.chart.result && data.chart.result[0];
      const centavos = Number(resultado && resultado.meta && resultado.meta.regularMarketPrice);

      // Validación: el café suele cotizar entre 50 y 1000 centavos por libra.
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

  /**
   * Fórmula matemática del precio. No consulta internet: solo calcula.
   *
   * @param {number} bolsaCentavos  Precio de la bolsa (centavos de dólar por libra).
   * @param {number} trm            Pesos colombianos por dólar.
   * @returns {object}              Pasos intermedios del cálculo y el precio final de la carga.
   */
  calcularCarga(bolsaCentavos, trm) {
    // 1. Kilos de café excelso que salen de una carga de pergamino: 125 x 70 / 94 = 93,09 kg.
    const kgExcelso = (KG_CARGA * KG_EXCELSO_BASE) / FACTOR_RENDIMIENTO;

    // 2. Esos kilos pasados a libras, porque la bolsa cotiza por libra.
    const libras = kgExcelso * LIBRAS_POR_KG;

    // 3. Precio por libra en DÓLARES: (bolsa + diferencial) / 100, porque están en centavos.
    const dolaresPorLibra = (bolsaCentavos + DIFERENCIAL_CENTAVOS) / 100;

    // 4. Valor de la carga en dólares y luego en pesos colombianos.
    const valorUSD = libras * dolaresPorLibra;
    const valorCOP = valorUSD * trm;

    // 5. Redondeo de 5.000 en 5.000 pesos, como lo publica la FNC.
    const precioCarga = Math.round(valorCOP / REDONDEO_COP) * REDONDEO_COP;

    return {
      kgExcelso: Number(kgExcelso.toFixed(2)),
      libras: Number(libras.toFixed(2)),
      dolaresPorLibra: Number(dolaresPorLibra.toFixed(4)),
      valorUSD: Number(valorUSD.toFixed(2)),
      precioCarga
    };
  }

  /**
   * Junta todo: consulta la TRM y la bolsa, calcula el precio y arma la
   * respuesta completa con el detalle de dónde salió cada dato.
   *
   * @returns {Promise<object>} Datos que se envían al frontend.
   */
  async calcularPrecio() {
    // Promise.all lanza las dos consultas AL MISMO TIEMPO (más rápido que una tras otra).
    const [trm, bolsa] = await Promise.all([this.obtenerTRM(), this.obtenerBolsa()]);
    const calculo = this.calcularCarga(bolsa.centavos, trm.valor);

    // Si alguna de las dos fuentes cayó al valor de respaldo, se avisa en la respuesta.
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

  /**
   * GET /api/precio
   * Atiende la petición del frontend. Si hay una respuesta guardada que
   * todavía no venció, la devuelve sin consultar de nuevo las APIs externas.
   */
  async obtener(req, res) {
    try {
      if (this.cache && Date.now() < this.cache.expiraEn) {
        return res.json(this.cache.datos);
      }

      const datos = await this.calcularPrecio();

      // Los datos reales se guardan 15 minutos; los de respaldo solo 2,
      // para volver a intentar pronto con las fuentes reales.
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
