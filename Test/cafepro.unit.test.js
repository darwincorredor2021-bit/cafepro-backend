// tests/cafepro.unit.test.js
// Suite de 14 Pruebas Unitarias - CaféPro Colombia (GA5-220501096-AA2-EV01)

// --- Implementaciones actuales bajo prueba (con los 6 defectos sin corregir) ---
function calcularPrecioCarga({ bolsaNY, trm, factorRendimiento, timeoutApi = false }) {
  const trmEfectiva = timeoutApi ? 4150 : trm; // Fallback en timeout
  const baseCarga = (bolsaNY * 2.20462 * 125) * trmEfectiva;
  const ajusteFactor = baseCarga * (92.8 / factorRendimiento);
  return Math.round(ajusteFactor);
}

function crearRegistroCosecha({ cantidadKg, precioUnitario, costos }, dbMock) {
  // DEF-01: Valida typeof === 'number' y !isNaN, pero omite Number.isFinite()
  if (typeof cantidadKg !== 'number' || Number.isNaN(cantidadKg) || cantidadKg <= 0) {
    return { status: 400, error: 'Cantidad inválida' };
  }
  const ingreso = cantidadKg * precioUnitario;
  const gananciaNeta = ingreso - costos;

  try {
    const id = dbMock.insert({ cantidadKg, precioUnitario, costos, gananciaNeta });
    return { status: 201, id, gananciaNeta };
  } catch (err) {
    return { status: 500, error: 'Error de conexión MySQL' };
  }
}

function calcularFaseLunar(fecha) {
  // DEF-03: Usa el día calendario del mes en vez de días julianos sobre ciclo sinódico
  const dia = fecha.getUTCDate();
  if (dia <= 7) return 'Luna Nueva';
  if (dia <= 14) return 'Cuarto Creciente';
  if (dia <= 21) return 'Luna Llena';
  return 'Cuarto Menguante';
}

function formatearFechaLocal(fechaISO) {
  // DEF-04: Instancia Date en UTC y extrae componentes locales (en UTC-5 retrocede 1 día)
  const d = new Date(fechaISO);
  // Simulamos explícitamente el desfase UTC-5 (America/Bogota)
  const bogota = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  const dia = String(bogota.getUTCDate()).padStart(2, '0');
  const mes = String(bogota.getUTCMonth() + 1).padStart(2, '0');
  const anio = bogota.getUTCFullYear();
  return `${dia}/${mes}/${anio}`;
}

function sanitizarInputCantidad(valorCrudo) {
  // DEF-05: Regex elimina el punto decimal '.'
  return valorCrudo.replace(/[^0-9]/g, '');
}

function validarUsuario(usuario) {
  // DEF-06: Evalúa length >= 3 sin aplicar .trim()
  return typeof usuario === 'string' && usuario.length >= 3;
}

// ==============================================================================
// BATERÍA DE 14 PRUEBAS UNITARIAS (PU-01 a PU-14)
// ==============================================================================

describe('Módulo 1: PrecioController', () => {
  test('PU-01: Cálculo estándar de carga de café (125 kg) con bolsa y TRM válidas', () => {
    const precio = calcularPrecioCarga({ bolsaNY: 2.45, trm: 4200, factorRendimiento: 92.8 });
    expect(precio).toBeGreaterThan(2800000);
  });

  test('PU-02: Aplicación proporcional de prima por mejor factor de rendimiento', () => {
    const precioBase = calcularPrecioCarga({ bolsaNY: 2.45, trm: 4200, factorRendimiento: 94.0 });
    const precioPrima = calcularPrecioCarga({ bolsaNY: 2.45, trm: 4200, factorRendimiento: 88.0 });
    expect(precioPrima).toBeGreaterThan(precioBase);
  });

  test('PU-03: Tolerancia ante timeout en API externa de TRM usando fallback', () => {
    const precio = calcularPrecioCarga({ bolsaNY: 2.45, trm: null, factorRendimiento: 92.8, timeoutApi: true });
    expect(precio).toBeGreaterThan(0);
  });

  test('PU-04 [DEF-02]: Debe rechazar TRM negativa o NaN lanzando error controlado', () => {
    expect(() => {
      const res = calcularPrecioCarga({ bolsaNY: 2.45, trm: -4200, factorRendimiento: 92.8 });
      if (res <= 0 || Number.isNaN(res)) {
        // Si no lanzó excepción interna, forzamos fallo para evidenciar que aceptó TRM negativa
        return res;
      }
    }).toThrow('Parámetros de mercado inválidos');
  });
});

describe('Módulo 2: RegistroController', () => {
  const mockDbOk = { insert: jest.fn(() => 101) };

  test('PU-05: Cálculo exacto de ganancia neta de cosecha', () => {
    const res = crearRegistroCosecha({ cantidadKg: 100, precioUnitario: 18500, costos: 620000 }, mockDbOk);
    expect(res.gananciaNeta).toBe(1230000);
  });

  test('PU-06: Inserción exitosa de registro en MySQL retorna HTTP 201', () => {
    const res = crearRegistroCosecha({ cantidadKg: 50, precioUnitario: 18000, costos: 200000 }, mockDbOk);
    expect(res.status).toBe(201);
    expect(res.id).toBe(101);
  });

  test('PU-07: Captura controlada de fallo de conexión MySQL retorna HTTP 500', () => {
    const mockDbFail = { insert: jest.fn(() => { throw new Error('ECONNREFUSED'); }) };
    const res = crearRegistroCosecha({ cantidadKg: 50, precioUnitario: 18000, costos: 200000 }, mockDbFail);
    expect(res.status).toBe(500);
  });

  test('PU-08 [DEF-01]: Debe rechazar valores no finitos (Infinity) con HTTP 400', () => {
    const res = crearRegistroCosecha({ cantidadKg: Infinity, precioUnitario: 15000, costos: 50000 }, mockDbOk);
    expect(res.status).toBe(400);
  });
});

describe('Módulo 3: Lógica Agronómica y Fechas (Frontend)', () => {
  test('PU-09: Identificación correcta de Luna Llena en fecha media del mes', () => {
    const fase = calcularFaseLunar(new Date('2026-11-18T12:00:00Z'));
    expect(fase).toBe('Luna Llena');
  });

  test('PU-10 [DEF-03]: Cálculo preciso de fase lunar en límite de cambio de mes UTC', () => {
    // El 2026-11-01 astronómicamente corresponde a Cuarto Menguante, no Luna Nueva
    const fase = calcularFaseLunar(new Date('2026-11-01T00:30:00Z'));
    expect(fase).toBe('Cuarto Menguante');
  });

  test('PU-11 [DEF-04]: Formateo de fecha ISO de MySQL sin retroceder 1 día en UTC-5', () => {
    const fechaFormateada = formatearFechaLocal('2026-11-15T00:00:00.000Z');
    expect(fechaFormateada).toBe('15/11/2026');
  });
});

describe('Módulo 4: Validación de Interfaz y Seguridad (UI & Auth)', () => {
  test('PU-12 [DEF-05]: El campo de cantidad debe conservar el punto decimal (12.5)', () => {
    const valorEnInput = sanitizarInputCantidad('12.5');
    expect(valorEnInput).toBe('12.5');
  });

  test('PU-13: Aceptación de nombre de usuario alfanumérico válido', () => {
    expect(validarUsuario('darwin_cafe')).toBe(true);
  });

  test('PU-14 [DEF-06]: Debe rechazar usuario compuesto solo por espacios en blanco', () => {
    expect(validarUsuario('     ')).toBe(false);
  });
});