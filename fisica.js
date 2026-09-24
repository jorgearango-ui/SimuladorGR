// ============================================
// MÓDULO DE FÍSICA
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

const FORMA_DATA = {
    aire:     { k_base: 0.02, nombre: 'Aire' },
    barra:    { k_base: 0.15, nombre: 'Barra recta' },
    u:        { k_base: 0.55, nombre: 'U / Herradura' },
    toroidal: { k_base: 0.85, nombre: 'Toroidal' }
};

function calcularRadioVisual(awg, diametroTuboM) {
    const radioReal = awg.d / 2;
    const factorExageracion = 2.0;
    const radioMaxPorTubo = (diametroTuboM / 2) / 15;
    return Math.max(0.0012, Math.min(radioReal * factorExageracion, radioMaxPorTubo));
}

function ajustePorRelacion(h, D) {
    const rel = h / D;
    if (rel >= 10) return 1.0;
    if (rel >= 5)  return 0.9;
    if (rel >= 2)  return 0.75;
    if (rel >= 1)  return 0.6;
    return 0.45;
}

function calcularBobina(p, radioVisual) {
    const h = p.longitud / 100;
    const D = p.diametro / 100;
    const N = p.vueltas;
    const I = p.corriente;
    const awg = AWG_DATA[p.awg];
    const nucleo = NUCLEO_DATA[p.nucleo];
    const formaInfo = FORMA_DATA[p.forma];

    const A_cond = Math.PI * Math.pow(awg.d / 2, 2);
    const l_hilo = N * Math.PI * D;
    const R = (RHO_CU * l_hilo) / A_cond;
    const S = Math.PI * Math.pow(D / 2, 2);

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

    const k = formaInfo.k_base * ajustePorRelacion(h, D);
    const L_nucleo = h;
    const B_real_raw = k * (MU_0 * N * I) / Math.sqrt(L_nucleo * L_nucleo + D * D);
    let B_real;
    if (nucleo.Bsat === Infinity) {
        B_real = B_real_raw;
    } else {
        B_real = nucleo.Bsat * Math.tanh(B_real_raw / nucleo.Bsat);
    }
    const F_real = (B_real * B_real * S) / (2 * MU_0);
    const m_max_real = F_real / G;

    const P = I * I * R;
    const V = I * R;
    const masa_cu = A_cond * l_hilo * 8960;
    const sobrecorriente = I > awg.imax;

    const diametroVisual = radioVisual * 2;
    const vueltasPorCapa = Math.max(1, Math.floor(h / diametroVisual));
    const numCapas = Math.ceil(N / vueltasPorCapa);

    const tuboRadio = (D / 2) * 0.92;
    const radioExterno = tuboRadio + radioVisual * (2 * numCapas + 1);

    return {
        h, D, N, I, awg, nucleo, forma: p.forma, formaInfo,
        A_cond, l_hilo, R, S,
        B_ideal, B_ideal_raw, saturado, F_ideal, m_max_ideal,
        B_real, B_real_raw, F_real, m_max_real, k,
        P, V, masa_cu, sobrecorriente,
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
// CLASE: SONIDO DEL SIMULADOR
// ============================================
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
}