// ============================================
// MÓDULO PRINCIPAL CON SOPORTE VR
// ============================================

let escena = null;
let grua = null;
let sonido = null;
let ultimoTiempoGrua = 0;
let explotado = false;

const estado = {
    longitud: 10,
    diametro: 5,
    vueltas: 200,
    awg: 20,
    nucleo: 'hierro',
    forma: 'barra',
    corriente: 0,
    temperatura: 25,
    equipada: false,
    resultado: null,
    modo: 'diseno'
};

window.estadoModo = 'diseno';

function vincularSlider(id, key, formato) {
    if (!formato) formato = v => v.toFixed(1);
    const slider = document.getElementById(id);
    const display = document.getElementById(id + '-val');
    if (!slider || !display) return;
    slider.addEventListener('input', () => {
        estado[key] = parseFloat(slider.value);
        display.textContent = formato(estado[key]);
        actualizarTodo();
    });
}

function actualizarTodo() {
    const awg = AWG_DATA[estado.awg];
    const diametroTuboM = estado.diametro / 100;
    const radioVisual = calcularRadioVisual(awg, diametroTuboM);

    const r = calcularBobina(estado, radioVisual);
    estado.resultado = r;

    if (estado.corriente > 0) {
        estado.temperatura = calcularTemperatura(r.P, r.masa_cu, 0.1, estado.temperatura);
    } else {
        estado.temperatura = Math.max(25, estado.temperatura - 5);
    }
    r.temperatura = estado.temperatura;

    if (estado.modo === 'diseno' && escena) {
        escena.dibujarEscenaDiseno(estado, r);
        escena.dibujarCampo(r.B_ideal, r.saturado);
        escena.dibujarElectrones(estado.corriente);
    }

    document.getElementById('hud-V').textContent = r.V.toFixed(2);
    document.getElementById('hud-B-ideal').textContent = r.B_ideal.toFixed(4);
    document.getElementById('hud-F').textContent = r.F_ideal.toFixed(2);
    document.getElementById('hud-m').textContent = r.m_max_ideal.toFixed(2);
    document.getElementById('hud-B-real').textContent = r.B_real.toExponential(3);
    document.getElementById('hud-F-real').textContent = r.F_real.toExponential(3);
    document.getElementById('hud-m-real').textContent = (r.m_max_real * 1000).toFixed(4);
    document.getElementById('hud-k').textContent = r.k.toFixed(4);
    document.getElementById('hud-P').textContent = r.P.toFixed(2);
    document.getElementById('hud-T').textContent = estado.temperatura.toFixed(0);
    document.getElementById('hud-sat').textContent = r.saturado ? 'SÍ ⚠️' : 'No';

    const avisoCapas = document.getElementById('aviso-capas');
    if (r.numCapas > 1) {
        avisoCapas.classList.remove('oculto');
        avisoCapas.textContent = `📚 Bobinado en ${r.numCapas} capas (${r.vueltasPorCapa} vueltas/capa)`;
    } else {
        avisoCapas.classList.add('oculto');
    }

    const avisoVueltas = document.getElementById('aviso-vueltas');
    if (estado.vueltas > 200) {
        avisoVueltas.classList.remove('oculto');
        avisoVueltas.textContent = `👁️ Mostrando ${Math.min(estado.vueltas, 200)} de ${estado.vueltas} vueltas`;
    } else {
        avisoVueltas.classList.add('oculto');
    }

    const avisoSat = document.getElementById('aviso-saturacion');
    if (r.saturado && estado.corriente > 0.5) {
        avisoSat.classList.remove('oculto');
    } else {
        avisoSat.classList.add('oculto');
    }

    if (estado.corriente > 0 && sonido) {
        sonido.iniciar();
        sonido.setCorriente(estado.corriente, 30);
    } else if (sonido) {
        sonido.setCorriente(0, 30);
    }

    const alerta = document.getElementById('alerta-peligro');
    if (estado.temperatura > 150) {
        alerta.classList.remove('oculto');
        if (sonido) sonido.alarma();
    } else {
        alerta.classList.add('oculto');
    }

    if (estado.temperatura > T_FUSION_CU || (r.sobrecorriente && estado.temperatura > 200)) {
        explotar();
    }

    actualizarLucesPanel();
    actualizarPantallaDigital();
}

function actualizarLucesPanel() {
    const luzVerde = document.getElementById('luz-verde');
    const luzAmarilla = document.getElementById('luz-amarilla');
    const luzRoja = document.getElementById('luz-roja');
    if (!luzVerde) return;

    const temp = estado.temperatura;

    luzVerde.classList.toggle('apagada', temp >= 100);
    luzAmarilla.classList.toggle('apagada', !(temp >= 100 && temp < 200));
    luzRoja.classList.toggle('apagada', temp < 200);
}

function actualizarPantallaDigital() {
    const canvas = document.getElementById('pantalla-digital');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const r = estado.resultado;
    if (!r) return;

    ctx.fillStyle = '#0a0f0a';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 500, 244);

    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TABLERO DE CONTROL', 256, 35);

    ctx.strokeStyle = '#00aa55';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, 50);
    ctx.lineTo(497, 50);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 22px monospace';

    const colorTemp = estado.temperatura > 200 ? '#ff3333' : estado.temperatura > 100 ? '#ffaa00' : '#00ff88';

    ctx.fillStyle = '#00ff88';
    ctx.fillText('VOLTAJE:', 25, 90);
    ctx.fillText('CORRIENTE:', 25, 130);
    ctx.fillText('PESO MÁX:', 25, 170);
    ctx.fillStyle = colorTemp;
    ctx.fillText('TEMP:', 25, 210);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`${r.V.toFixed(1)} V`, 480, 90);
    ctx.fillText(`${estado.corriente.toFixed(1)} A`, 480, 130);
    ctx.fillText(`${(r.m_max_real * 1000).toFixed(2)} g`, 480, 170);
    ctx.fillStyle = colorTemp;
    ctx.fillText(`${estado.temperatura.toFixed(0)} °C`, 480, 210);
}

function conectarControlesGrua() {
    const ctrlPotencia = document.getElementById('ctrl-potencia');
    const ctrlRotacion = document.getElementById('ctrl-rotacion');
    const ctrlExtension = document.getElementById('ctrl-extension');
    const ctrlElevacion = document.getElementById('ctrl-elevacion');

    ctrlPotencia.addEventListener('input', () => {
        estado.corriente = parseFloat(ctrlPotencia.value);
        document.getElementById('val-potencia').textContent = estado.corriente.toFixed(1) + ' A';
        const sliderOriginal = document.getElementById('corriente');
        if (sliderOriginal) {
            sliderOriginal.value = estado.corriente;
            document.getElementById('corriente-val').textContent = estado.corriente.toFixed(1);
        }
        actualizarTodo();
    });

    ctrlRotacion.addEventListener('input', () => {
        if (!grua) return;
        grua.rotacion = parseFloat(ctrlRotacion.value);
        document.getElementById('val-rotacion').textContent = grua.rotacion.toFixed(0) + '°';
        grua.actualizarPosiciones();
    });

    ctrlExtension.addEventListener('input', () => {
        if (!grua) return;
        grua.extension = parseFloat(ctrlExtension.value);
        document.getElementById('val-extension').textContent = grua.extension.toFixed(2);
        grua.actualizarPosiciones();
    });

    ctrlElevacion.addEventListener('input', () => {
        if (!grua) return;
        grua.control = parseFloat(ctrlElevacion.value);
        document.getElementById('val-elevacion').textContent = grua.control.toFixed(2);
    });

    document.getElementById('btn-soltar-flotante').addEventListener('click', () => {
        if (grua) grua.soltarPeso();
    });
}

function explotar() {
    if (explotado) return;
    explotado = true;
    if (sonido) sonido.explosion();
    const pos = new THREE.Vector3(0, escena.offsetAlambre ? escena.offsetAlambre.y : 0.5, 0);
    if (escena) escena.explotarBobina(pos);
    estado.corriente = 0;
    const sliderCorriente = document.getElementById('corriente');
    if (sliderCorriente) {
        sliderCorriente.value = 0;
        document.getElementById('corriente-val').textContent = '0.0';
    }
    const ctrlPotencia = document.getElementById('ctrl-potencia');
    if (ctrlPotencia) {
        ctrlPotencia.value = 0;
        document.getElementById('val-potencia').textContent = '0.0 A';
    }
    setTimeout(() => {
        alert("💥 ¡La bobina ha explotado!");
        explotado = false;
        estado.temperatura = 25;
        if (escena) {
            escena.grupoEscena.visible = true;
            escena.grupoCampo.visible = true;
            escena.grupoElectrones.visible = true;
            escena.grupoParticulasCampo.visible = true;
            while (escena.grupoExplosion.children.length > 0) {
                escena.grupoExplosion.remove(escena.grupoExplosion.children[0]);
            }
            escena.particulasExplosion = [];
        }
        actualizarTodo();
    }, 3500);
}

function loopGrua(tiempo) {
    if (estado.modo === 'grua' && grua && grua.equipada) {
        const dt = Math.min((tiempo - ultimoTiempoGrua) / 1000, 0.1);
        grua.actualizar(grua.control, dt);
    }
    ultimoTiempoGrua = tiempo;
    requestAnimationFrame(loopGrua);
}

// ============================================
// WEBXR: BOTÓN "ENTRAR EN VR"
// ============================================
function configurarBotonVR() {
    const btnVR = document.getElementById('btn-entrar-vr');
    if (!btnVR) return;

    if (!navigator.xr) {
        btnVR.textContent = '❌ VR no soportado';
        btnVR.style.background = '#666';
        btnVR.style.cursor = 'not-allowed';
        return;
    }

    navigator.xr.isSessionSupported('immersive-vr').then(supported => {
        if (!supported) {
            btnVR.textContent = '❌ VR no disponible';
            btnVR.style.background = '#666';
            btnVR.style.cursor = 'not-allowed';
            return;
        }

        btnVR.addEventListener('click', async () => {
            try {
                const session = await navigator.xr.requestSession('immersive-vr', {
                    optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
                });
                escena.renderer.xr.setSession(session);
                console.log("🥽 Sesión VR iniciada");

                session.addEventListener('end', () => {
                    console.log("🥽 Sesión VR terminada");
                });
            } catch (e) {
                alert('No se pudo iniciar VR: ' + e.message);
                console.error(e);
            }
        });
    });
}

// ============================================
// INICIALIZACIÓN
// ============================================
window.addEventListener('load', () => {
    console.log("🚀 Iniciando simulador...");
    const contenedor = document.getElementById('vista-3d');
    if (typeof THREE === 'undefined') {
        alert("No se pudo cargar Three.js.");
        return;
    }
    escena = new Escena3D(contenedor);
    grua = new GruaElectromagnetica(escena);
    sonido = new SonidoSimulador();

    vincularSlider('longitud', 'longitud');
    vincularSlider('diametro', 'diametro');
    vincularSlider('vueltas', 'vueltas', v => v.toFixed(0));
    vincularSlider('corriente', 'corriente');

    document.getElementById('calibre').addEventListener('change', e => {
        estado.awg = parseInt(e.target.value);
        actualizarTodo();
    });
    document.getElementById('nucleo').addEventListener('change', e => {
        estado.nucleo = e.target.value;
        actualizarTodo();
    });
    document.getElementById('forma').addEventListener('change', e => {
        estado.forma = e.target.value;
        actualizarTodo();
    });

    document.getElementById('btn-guardar').addEventListener('click', () => {
        if (estado.resultado) generarInforme(estado, estado.resultado);
    });
    window.equiparGrua = function() {
    if (!estado.resultado) return;
    estado.modo = 'grua';
    estado.equipada = true;
    escena.crearEntornoIndustrial();
    grua.equipar(estado, estado.resultado);
    escena.cambiarAmbiente('grua');
    document.getElementById('panel-grua-flotante').classList.add('visible');
    console.log("🏗️ Modo grúa activado desde VR");
};

window.volverDiseno = function() {
    estado.modo = 'diseno';
    estado.equipada = false;
    if (grua) grua.soltarPeso();
    escena.cambiarAmbiente('diseno');
    document.getElementById('panel-grua-flotante').classList.remove('visible');
    actualizarTodo();
    console.log("📐 Modo diseño activado desde VR");
};
    document.getElementById('btn-equipar').addEventListener('click', () => {
        if (!estado.resultado) return;
        estado.modo = 'grua';
        estado.equipada = true;
        escena.crearEntornoIndustrial();
        grua.equipar(estado, estado.resultado);
        escena.cambiarAmbiente('grua');
        document.getElementById('panel-grua-flotante').classList.add('visible');
        console.log("🏗️ Modo grúa activado");
    });

    document.getElementById('btn-volver').addEventListener('click', () => {
        estado.modo = 'diseno';
        estado.equipada = false;
        if (grua) grua.soltarPeso();
        escena.cambiarAmbiente('diseno');
        document.getElementById('panel-grua-flotante').classList.remove('visible');
        actualizarTodo();
        console.log("📐 Modo diseño activado");
    });

    document.getElementById('btn-soltar').addEventListener('click', () => {
        if (grua) grua.soltarPeso();
    });

    const panelControl = document.getElementById('panel-control');
    const btnToggle = document.getElementById('btn-toggle-panel');
    btnToggle.addEventListener('click', () => {
        if (panelControl.style.display === 'none') {
            panelControl.style.display = 'block';
            btnToggle.textContent = '📋 Ocultar panel';
        } else {
            panelControl.style.display = 'none';
            btnToggle.textContent = '📋 Mostrar panel';
        }
    });

    window.addEventListener('resize', () => {
        if (escena) escena.resize();
    });

    conectarControlesGrua();
    configurarBotonVR();
    actualizarTodo();
    ultimoTiempoGrua = performance.now();
    requestAnimationFrame(loopGrua);
    console.log("✅ Simulador iniciado correctamente");
    console.log("🥽 Si tienes un visor VR, pulsa 'Entrar en VR'");
});