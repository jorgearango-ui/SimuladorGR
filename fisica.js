// ============================================
// MÓDULO DE FÍSICA + SONIDO + VR HELPERS
// VERSIÓN FINAL: FUENTE DE VOLTAJE + FÍSICA CORRECTA
// ============================================

const MU_0 = 4 * Math.PI * 1e-7;
const G = 9.81;
const RHO_CU = 1.68e-8;
const T_FUSION_CU = 1085;
const T_AMBIENTE = 25;
const CAPACIDAD_TERMICA_CU = 385;

const AWG_DATA = {
    10: { d: 2.588e-3, imax: 55 }, 12: { d: 2.053e-3, imax: 41 },
    14: { d: 1.628e-3, imax: 32 }, 16: { d: 1.291e-3, imax: 22 },
    18: { d: 1.024e-3, imax: 16 }, 20: { d: 0.812e-3, imax: 11 },
    22: { d: 0.644e-3, imax: 7 },  24: { d: 0.511e-3, imax: 3.5 },
    26: { d: 0.405e-3, imax: 2.2 }, 28: { d: 0.321e-3, imax: 1.4 }
};

const NUCLEO_DATA = {
    aire:      { mu_r: 1,      Bsat: Infinity, color: 0x000000, metal: 0,   rough: 1 },
    hierro:    { mu_r: 5000,   Bsat: 2.2,      color: 0x505055, metal: 0.85, rough: 0.35 },
    ferrita:   { mu_r: 2000,   Bsat: 0.4,      color: 0x2a2a2a, metal: 0.4,  rough: 0.7 },
    silicio:   { mu_r: 7000,   Bsat: 1.8,      color: 0x707880, metal: 0.9,  rough: 0.3 },
    permalloy: { mu_r: 100000, Bsat: 0.8,      color: 0x8a8a95, metal: 0.95, rough: 0.25 }
};

// ============================================
// FORMA_DATA: solo para nombre legible
// ============================================
const FORMA_DATA = {
    aire:  { nombre: 'Solenoide sin núcleo' },
    barra: { nombre: 'Barra recta' },
    u:     { nombre: 'U / Herradura' }
};

// ============================================
// GEOMETRÍA FÍSICA POR FORMA
// - radioPolo: radio del área de contacto con la pieza
// - longitudCircuito: longitud del camino magnético en el material
// - numPolos: cuántas caras de contacto tocan la pieza
// - entrehierro: separación efectiva polo-pieza (rugosidad + microscópico)
// ============================================
const GEOMETRIA_FORMA = {
    aire: {
        nombre: 'Solenoide sin núcleo',
        radioPolo: (D) => D / 2,
        longitudCircuito: (h, D) => h,
        numPolos: 1,
        entrehierro: 3e-3                    // 3 mm: campo muy débil en el aire
    },
    barra: {
        nombre: 'Barra recta',
        radioPolo: (D) => (D / 2) * 0.65,
        longitudCircuito: (h, D) => h,
        numPolos: 1,
        entrehierro: 3e-4                    // 0.3 mm: 1 polo plano
    },
    u: {
        nombre: 'U / Herradura',
        radioPolo: (D) => (D / 2) * 0.55,
        longitudCircuito: (h, D) => h + D,
        numPolos: 2,                         // 2 polos
        entrehierro: 5e-5                    // 0.05 mm por polo: circuito más cerrado
    }
};

const EFICIENCIA_FLUJO = 0.92;               // pérdidas por capas y dispersión

function calcularRadioVisual(awg, diametroTuboM) {
    const radioReal = awg.d / 2;
    const factorExageracion = 2.0;
    const radioMaxPorTubo = (diametroTuboM / 2) / 15;
    return Math.max(0.0012, Math.min(radioReal * factorExageracion, radioMaxPorTubo));
}

// ============================================
// RESISTENCIA (SOLO DEPENDE DEL DISEÑO)
// ============================================
function calcularResistencia(p) {
    const D = p.diametro / 100;
    const awg = AWG_DATA[p.awg];
    const A_cond = Math.PI * Math.pow(awg.d / 2, 2);
    const l_hilo = p.vueltas * Math.PI * D;
    const R = (RHO_CU * l_hilo) / A_cond;
    return { R, A_cond, l_hilo };
}

// ============================================
// CÁLCULO PRINCIPAL: voltaje → corriente → fuerza
// ============================================
function calcularBobina(p, radioVisual, V_fuente) {
    const h = p.longitud / 100;
    const D = p.diametro / 100;
    const N = p.vueltas;
    const awg = AWG_DATA[p.awg];
    const nucleo = NUCLEO_DATA[p.nucleo];
    const geo = GEOMETRIA_FORMA[p.forma];
    const formaInfo = FORMA_DATA[p.forma];

    // ============================================
    // LEY DE OHM
    // ============================================
    const { R, A_cond, l_hilo } = calcularResistencia(p);
    const I = R > 0 ? V_fuente / R : 0;
    const V = V_fuente;

    // Área transversal del tubo completo (se usa en el IDEAL)
    const S = Math.PI * Math.pow(D / 2, 2);

    // ============================================
    // MODELO IDEAL (solenoide infinito, área del tubo)
    // ============================================
    const B_ideal_raw = (MU_0 * nucleo.mu_r * N * I) / h;
    let B_ideal;
    if (nucleo.Bsat === Infinity) {
        B_ideal = B_ideal_raw;
    } else {
        B_ideal = nucleo.Bsat * Math.tanh(B_ideal_raw / nucleo.Bsat);
    }
    const saturado = B_ideal_raw > nucleo.Bsat * 0.7;
    const F_ideal = (B_ideal * B_ideal * S) / (2 * MU_0);
    const m_max_ideal = F_ideal / G;

    // ============================================
    // MODELO REALISTA (L_c real, A_polo real, N_polos, g específico)
    // ============================================
    const r_polo = geo.radioPolo(D);
    const A_polo = Math.PI * r_polo * r_polo;
    const L_c = geo.longitudCircuito(h, D);
    const g = geo.entrehierro;
    const N_polos = geo.numPolos;

    const B_real_raw = (MU_0 * nucleo.mu_r * N * I) / (L_c + nucleo.mu_r * g);
    let B_real;
    if (nucleo.Bsat === Infinity) {
        B_real = B_real_raw * EFICIENCIA_FLUJO;
    } else {
        B_real = nucleo.Bsat * Math.tanh(B_real_raw / nucleo.Bsat) * EFICIENCIA_FLUJO;
    }

    // Fuerza total = N_polos × (B² · A_polo) / (2·μ₀)
    const F_real = N_polos * (B_real * B_real * A_polo) / (2 * MU_0);
    const m_max_real = F_real / G;

    const k = F_ideal > 0 ? (F_real / F_ideal) : 0;

    // ============================================
    // TÉRMICA Y ELÉCTRICA
    // ============================================
    const P = I * I * R;
    const masa_cu = A_cond * l_hilo * 8960;
    const sobrecorriente = I > awg.imax;

    // ============================================
    // GEOMETRÍA VISUAL
    // ============================================
    const diametroVisual = radioVisual * 2;
    const vueltasPorCapa = Math.max(1, Math.floor(h / diametroVisual));
    const numCapas = Math.ceil(N / vueltasPorCapa);

    const tuboRadio = (D / 2) * 0.92;
    const radioExterno = tuboRadio + radioVisual * (2 * numCapas + 1);

    return {
        h, D, N, I, V, V_fuente, R, awg, nucleo, forma: p.forma, formaInfo,
        A_cond, l_hilo, S,
        // Ideal
        B_ideal, B_ideal_raw, saturado, F_ideal, m_max_ideal,
        // Realista
        B_real, B_real_raw, F_real, m_max_real, k,
        A_polo, r_polo, L_c, g_entrehierro: g, N_polos,
        // Eléctrico
        P, masa_cu, sobrecorriente,
        // Visual
        vueltasPorCapa, numCapas, radioVisual, radioExterno, tuboRadio
    };
}

function calcularTemperatura(P, masa_cu, t, T_actual) {
    const c = CAPACIDAD_TERMICA_CU;
    const k = 0.05;
    const dT = (P / (masa_cu * c) - k * (T_actual - T_AMBIENTE)) * t;
    return Math.min(T_actual + dT, T_FUSION_CU + 100);
}

// ============================================
// FORMATEO ADAPTATIVO DE PESO
// ============================================
function formatearPeso(kg) {
    if (kg >= 1)      return kg.toFixed(3) + ' kg';
    if (kg >= 0.001)  return (kg * 1000).toFixed(2) + ' g';
    if (kg >= 1e-6)   return (kg * 1e6).toFixed(2) + ' mg';
    return (kg * 1e9).toFixed(2) + ' µg';
}

class SonidoSimulador {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.zumbido = null;
        this.gainZumbido = null;
        this.iniciado = false;
        this.ultimaAlarma = 0;
    }
    iniciar() {
        if (this.iniciado) return;
        this.ctx.resume();
        this.zumbido = this.ctx.createOscillator();
        this.zumbido.type = 'sawtooth';
        this.zumbido.frequency.value = 50;
        this.gainZumbido = this.ctx.createGain();
        this.gainZumbido.gain.value = 0;
        this.zumbido.connect(this.gainZumbido);
        this.gainZumbido.connect(this.ctx.destination);
        this.zumbido.start();
        this.iniciado = true;
    }
    setCorriente(I, Imax) {
        if (!this.iniciado) return;
        const nivel = Math.min(I / Imax, 1);
        this.gainZumbido.gain.value = nivel * 0.15;
        this.zumbido.frequency.value = 50 + nivel * 100;
    }
    explosion() {
        if (!this.iniciado) { this.ctx.resume(); this.iniciado = true; }
        const t0 = this.ctx.currentTime;
        const duracion = 2.0;
        const bufferSize = this.ctx.sampleRate * duracion;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 3);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gainRuido = this.ctx.createGain();
        gainRuido.gain.setValueAtTime(0.8, t0);
        gainRuido.gain.exponentialRampToValueAtTime(0.001, t0 + duracion);
        const filtro = this.ctx.createBiquadFilter();
        filtro.type = 'lowpass';
        filtro.frequency.setValueAtTime(3000, t0);
        filtro.frequency.exponentialRampToValueAtTime(200, t0 + duracion);
        source.connect(filtro);
        filtro.connect(gainRuido);
        gainRuido.connect(this.ctx.destination);
        source.start(t0);

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t0);
        osc.frequency.exponentialRampToValueAtTime(30, t0 + 0.8);
        const gainOsc = this.ctx.createGain();
        gainOsc.gain.setValueAtTime(0.9, t0);
        gainOsc.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9);
        osc.connect(gainOsc);
        gainOsc.connect(this.ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 1.0);

        for (let i = 0; i < 20; i++) {
            const t = t0 + 0.05 + Math.random() * 0.5;
            const osc2 = this.ctx.createOscillator();
            osc2.type = 'square';
            osc2.frequency.value = 1500 + Math.random() * 3000;
            const gain2 = this.ctx.createGain();
            gain2.gain.setValueAtTime(0.1, t);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(t);
            osc2.stop(t + 0.06);
        }
    }
    alarma() {
        const ahora = this.ctx.currentTime;
        if (ahora - this.ultimaAlarma < 0.5) return;
        this.ultimaAlarma = ahora;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.value = 880;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.1, ahora);
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(ahora + 0.3);
    }
    whoosh() {
        if (!this.iniciado) { this.ctx.resume(); this.iniciado = true; }
        const t0 = this.ctx.currentTime;
        const duracion = 0.8;
        const bufferSize = this.ctx.sampleRate * duracion;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const filtro = this.ctx.createBiquadFilter();
        filtro.type = 'bandpass';
        filtro.Q.value = 5;
        filtro.frequency.setValueAtTime(2000, t0);
        filtro.frequency.exponentialRampToValueAtTime(200, t0 + duracion);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.3, t0 + duracion * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duracion);
        source.connect(filtro);
        filtro.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(t0);
        source.stop(t0 + duracion);

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t0);
        osc.frequency.exponentialRampToValueAtTime(150, t0 + duracion);
        const gainOsc = this.ctx.createGain();
        gainOsc.gain.setValueAtTime(0.15, t0);
        gainOsc.gain.exponentialRampToValueAtTime(0.001, t0 + duracion);
        osc.connect(gainOsc);
        gainOsc.connect(this.ctx.destination);
        osc.start(t0);
        osc.stop(t0 + duracion);
    }
}

// ============================================
// INFORME WORD
// ============================================
function generarInforme(params, r) {
    const fecha = new Date().toLocaleDateString('es-ES');
    const nombre = prompt("Nombre del estudiante:", "Estudiante") || "Estudiante";
    if (typeof docx !== 'undefined') {
        try { generarInformeDocx(params, r, nombre, fecha); return; }
        catch (e) { console.warn("Fallo docx, plan B", e); }
    }
    generarInformeHTML(params, r, nombre, fecha);
}

function generarInformeDocx(params, r, nombre, fecha) {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } = docx;
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ text: "INFORME DE DISEÑO DE BOBINA ELECTROMAGNÉTICA", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: `Fecha: ${fecha}`, break: 1 }), new TextRun({ text: `Estudiante: ${nombre}`, break: 1 })] }),
                new Paragraph({ text: "1. PARÁMETROS DE DISEÑO", heading: HeadingLevel.HEADING_2 }),
                crearTablaDocx([
                    ["Longitud del tubo (h)", `${params.longitud} cm`],
                    ["Diámetro del tubo (D)", `${params.diametro} cm`],
                    ["Número de vueltas (N)", `${params.vueltas}`],
                    ["Vueltas por capa", `${r.vueltasPorCapa}`],
                    ["Número de capas", `${r.numCapas}`],
                    ["Calibre del alambre", `AWG ${params.awg}`],
                    ["Material del núcleo", params.nucleo],
                    ["Forma del núcleo", r.formaInfo.nombre],
                    ["Voltaje de la fuente (V)", `${params.voltaje} V`]
                ]),
                new Paragraph({ text: "2. RESISTENCIA Y CORRIENTE (LEY DE OHM)", heading: HeadingLevel.HEADING_2 }),
                new Paragraph(`R = ρ · l / A = ${r.R.toFixed(4)} Ω`),
                new Paragraph(`I = V / R = ${r.V.toFixed(2)} / ${r.R.toFixed(4)} = ${r.I.toFixed(3)} A`),
                new Paragraph(`Corriente máxima del alambre (AWG ${params.awg}): ${r.awg.imax} A`),
                new Paragraph(`¿Sobrecorriente? ${r.sobrecorriente ? 'SÍ ⚠️' : 'No'}`),
                new Paragraph({ text: "3. MODELO IDEAL (TEÓRICO)", heading: HeadingLevel.HEADING_2 }),
                new Paragraph("B_ideal = Bsat · tanh( μ₀·μr·N·I / (Bsat·h) )"),
                new Paragraph("F_ideal = B² · S / (2·μ₀)  con S = π(D/2)²  (área del tubo completo)"),
                new Paragraph(`B_ideal (sin saturar) = ${r.B_ideal_raw.toFixed(4)} T`),
                new Paragraph(`B_ideal (con saturación) = ${r.B_ideal.toFixed(4)} T`),
                new Paragraph(`¿Saturado? ${r.saturado ? 'SÍ' : 'NO'}`),
                new Paragraph(`F_ideal = ${r.F_ideal.toFixed(2)} N`),
                new Paragraph(`m_max_ideal = ${formatearPeso(r.m_max_ideal)}`),
                new Paragraph({ text: "4. MODELO REALISTA (APLICADO)", heading: HeadingLevel.HEADING_2 }),
                new Paragraph("B_real = Bsat · tanh( μ₀·μr·N·I / [Bsat·(L_c + μr·g)] ) · η"),
                new Paragraph("F_real = N_polos · B² · A_polo / (2·μ₀)"),
                new Paragraph(`Forma: ${r.formaInfo.nombre}`),
                new Paragraph(`Número de polos: ${r.N_polos}`),
                new Paragraph(`Radio del polo r_p = ${(r.r_polo*100).toFixed(3)} cm`),
                new Paragraph(`Área del polo A_p = ${r.A_polo.toExponential(3)} m²`),
                new Paragraph(`Longitud del circuito L_c = ${(r.L_c*100).toFixed(2)} cm`),
                new Paragraph(`Entrehierro g = ${(r.g_entrehierro*1000).toFixed(3)} mm`),
                new Paragraph(`Eficiencia de flujo η = ${EFICIENCIA_FLUJO}`),
                new Paragraph(`B_real (sin saturar) = ${r.B_real_raw.toFixed(4)} T`),
                new Paragraph(`B_real = ${r.B_real.toExponential(4)} T`),
                new Paragraph(`F_real = ${r.F_real.toExponential(4)} N`),
                new Paragraph(`m_max_real = ${formatearPeso(r.m_max_real)}`),
                new Paragraph({ text: "5. COMPARACIÓN", heading: HeadingLevel.HEADING_2 }),
                crearTablaDocx([
                    ["Magnitud", "Ideal", "Realista"],
                    ["Campo B (T)", r.B_ideal.toExponential(3), r.B_real.toExponential(3)],
                    ["Fuerza F (N)", r.F_ideal.toExponential(3), r.F_real.toExponential(3)],
                    ["Peso máx", formatearPeso(r.m_max_ideal), formatearPeso(r.m_max_real)]
                ]),
                new Paragraph({ text: "6. NOTA ACLARATORIA", heading: HeadingLevel.HEADING_2 }),
                new Paragraph("El modelo ideal (solenoide infinito) asume campo uniforme y usa el área total del tubo. El modelo realista corrige tres cosas: (a) el área efectiva es la del POLO de contacto, no del tubo; (b) el camino magnético real (L_c) es mayor que la longitud del devanado, y depende de la geometría; (c) existe un entrehierro inevitable g entre polo y pieza. La forma en U tiene 2 polos, por eso duplica la fuerza de atracción."),
                new Paragraph({ text: "7. CONCLUSIÓN", heading: HeadingLevel.HEADING_2 }),
                new Paragraph(
                    r.sobrecorriente
                        ? "⚠️ El diseño NO es viable: la corriente excede el límite del alambre."
                        : (r.m_max_real >= 0.001
                            ? `✓ Viable. Puede levantar hasta ${formatearPeso(r.m_max_real)}.`
                            : `⚠️ Fuerza real muy baja (${formatearPeso(r.m_max_real)}).`)
                ),
                new Paragraph({ text: "8. ECUACIONES", heading: HeadingLevel.HEADING_2 }),
                new Paragraph("• I = V / R  (ley de Ohm)"),
                new Paragraph("• R = ρ · l / A_cond"),
                new Paragraph("• B_ideal = Bsat · tanh( μ₀·μr·N·I / (Bsat·h) )"),
                new Paragraph("• F_ideal = B² · S / (2·μ₀)"),
                new Paragraph("• B_real = Bsat · tanh( μ₀·μr·N·I / [Bsat·(L_c + μr·g)] ) · η"),
                new Paragraph("• F_real = N_polos · B² · A_polo / (2·μ₀)"),
                new Paragraph("• P = I² · R")
            ]
        }]
    });
    Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe_bobina_${Date.now()}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

function crearTablaDocx(filas) {
    const { Table, TableRow, TableCell, Paragraph, WidthType } = docx;
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: filas.map(([k, v1, v2]) => new TableRow({
            children: v2 !== undefined
                ? [
                    new TableCell({ children: [new Paragraph({ text: k, bold: true })] }),
                    new TableCell({ children: [new Paragraph(v1)] }),
                    new TableCell({ children: [new Paragraph(v2)] })
                  ]
                : [
                    new TableCell({ children: [new Paragraph({ text: k, bold: true })] }),
                    new TableCell({ children: [new Paragraph(v1)] })
                  ]
        }))
    });
}

function generarInformeHTML(params, r, nombre, fecha) {
    const html = `<html><head><meta charset="utf-8"><title>Informe</title></head><body>
<h1>INFORME DE DISEÑO DE BOBINA</h1>
<p><b>Fecha:</b> ${fecha}<br><b>Estudiante:</b> ${nombre}</p>
<h2>1. Parámetros</h2>
<table border="1" cellpadding="5">
<tr><th>Parámetro</th><th>Valor</th></tr>
<tr><td>Longitud</td><td>${params.longitud} cm</td></tr>
<tr><td>Diámetro</td><td>${params.diametro} cm</td></tr>
<tr><td>Vueltas</td><td>${params.vueltas}</td></tr>
<tr><td>Calibre</td><td>AWG ${params.awg}</td></tr>
<tr><td>Núcleo</td><td>${params.nucleo}</td></tr>
<tr><td>Forma</td><td>${r.formaInfo.nombre}</td></tr>
<tr><td>Voltaje</td><td>${params.voltaje} V</td></tr>
</table>
<h2>2. Resistencia y corriente</h2>
<p>R = ${r.R.toFixed(4)} Ω<br>
I = V/R = ${r.I.toFixed(3)} A<br>
Sobrecorriente: ${r.sobrecorriente ? 'SÍ' : 'No'}</p>
<h2>3. Modelo ideal</h2>
<p>B_ideal = ${r.B_ideal.toFixed(4)} T<br>
F_ideal = ${r.F_ideal.toFixed(2)} N<br>
m_max_ideal = ${formatearPeso(r.m_max_ideal)}</p>
<h2>4. Modelo realista</h2>
<p>Polos: ${r.N_polos}<br>
Área polo: ${r.A_polo.toExponential(3)} m²<br>
B_real = ${r.B_real.toExponential(4)} T<br>
F_real = ${r.F_real.toExponential(4)} N<br>
m_max_real = ${formatearPeso(r.m_max_real)}</p>
<h2>5. Conclusión</h2>
<p>${r.m_max_real >= 0.001 ? 'Viable, puede levantar ' + formatearPeso(r.m_max_real) : 'Fuerza real muy baja'}</p>
</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_bobina_${Date.now()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
}