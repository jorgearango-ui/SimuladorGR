// ============================================
// MÓDULO PRINCIPAL - ORQUESTADOR
// ============================================
// Maneja:
// - El renderer compartido
// - El laboratorio (Local 1) y el patio (Local 2)
// - El teletransporte entre locales con fade + whoosh
// - Los controles VR (sliders, botones cicladores, botones de acción)
// - El XRRig (para trasladar al jugador en VR)
// - El loop principal de animación
// ============================================

// ============================================
// VARIABLES GLOBALES
// ============================================
let escena = null;         // Local 1: laboratorio
let escenaPatio = null;    // Local 2: patio industrial
let grua = null;
let sonido = null;
let renderer = null;
let xrRig = null;          // Grupo del XR (contiene cámara VR)

let ultimoTiempoGrua = 0;
let ultimoTiempoFrame = 0;
let explotado = false;

// Estado del simulador
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
    modo: 'diseno',       // 'diseno' o 'grua'
    localActual: 'lab'    // 'lab' o 'patio'
};

window.estadoModo = 'diseno';

// ============================================
// TELETRANSPORTE ENTRE LOCALES
// ============================================
function trasladarA(local) {
    // Si ya estamos en ese local, no hacer nada
    if (estado.localActual === local) return;

    const fade = document.getElementById('fade-transicion');
    if (!fade) return;

    // 1. Fade a negro
    fade.classList.add('activo');

    // 2. Reproducir sonido de whoosh
    if (sonido) {
        sonido.iniciado = true;
        sonido.whoosh();
    }

    // 3. Esperar 0.5s (mitad del fade) y teletransportar
    setTimeout(() => {
        // Cambiar visibilidad de los locales
        if (local === 'patio') {
            if (escena) escena.ocultar();
            if (escenaPatio) escenaPatio.mostrar();
            estado.localActual = 'patio';
            estado.modo = 'grua';

            document.getElementById('modo-indicador').textContent = '🏗️ PATIO INDUSTRIAL';
            document.getElementById('modo-indicador').style.color = '#ff8c00';
            document.getElementById('modo-indicador').style.background = 'rgba(0,0,0,0.7)';

            // Cámara en PC: vista del patio
            if (escena && escena.camera) {
                escena.camera.position.set(VR_LOCAL_PATIO + 0.5, 2.5, 9);
                if (escena.controls) {
                    escena.controls.target.set(VR_LOCAL_PATIO - 0.3, 1.0, 2.5);
                    escena.controls.update();
                }
            }

            // En VR: mover el XRRig
            if (xrRig) {
                xrRig.position.set(VR_LOCAL_PATIO, 0, 0);
            }

        } else {
            if (escenaPatio) escenaPatio.ocultar();
            if (escena) escena.mostrar();
            estado.localActual = 'lab';
            estado.modo = 'diseno';

            document.getElementById('modo-indicador').textContent = '📐 LABORATORIO';
            document.getElementById('modo-indicador').style.color = '#4ecca3';
            document.getElementById('modo-indicador').style.background = 'rgba(0,0,0,0.7)';

            if (escena && escena.camera) {
                escena.camera.position.set(0.5, 1.5, 2.5);
                if (escena.controls) {
                    escena.controls.target.set(0, 1.3, 0);
                    escena.controls.update();
                }
            }

            if (xrRig) {
                xrRig.position.set(VR_LOCAL_LAB, 0, 0);
            }
        }

        // 4. Quitar fade
        setTimeout(() => {
            fade.classList.remove('activo');
        }, 300);
    }, 500);
}

// ============================================
// VINCULACIÓN DE CONTROLES HTML
// ============================================
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

// ============================================
// ACTUALIZACIÓN GLOBAL
// ============================================
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

    // Redibujar la escena del laboratorio solo si estamos ahí
    if (estado.localActual === 'lab' && escena) {
        escena.dibujarEscenaDiseno(estado, r);
        escena.dibujarCampo(r.B_ideal, r.saturado);
        escena.dibujarElectrones(estado.corriente);
    }

    // HUD HTML
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

    // Sonido
    if (estado.corriente > 0 && sonido) {
        sonido.iniciar();
        sonido.setCorriente(estado.corriente, 30);
    } else if (sonido) {
        sonido.setCorriente(0, 30);
    }

    // Alerta
    const alerta = document.getElementById('alerta-peligro');
    if (estado.temperatura > 150) {
        alerta.classList.remove('oculto');
        if (sonido) sonido.alarma();
    } else {
        alerta.classList.add('oculto');
    }

    // Explosión
    if (estado.temperatura > T_FUSION_CU || (r.sobrecorriente && estado.temperatura > 200)) {
        explotar();
    }

    // Actualizar luces del panel flotante
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

// ============================================
// EXPLOSIÓN
// ============================================
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

// ============================================
// CONTROLES DEL PANEL FLOTANTE HTML
// ============================================
function conectarControlesGrua() {
    const ctrlPotencia = document.getElementById('ctrl-potencia');
    const ctrlRotacion = document.getElementById('ctrl-rotacion');
    const ctrlExtension = document.getElementById('ctrl-extension');
    const ctrlElevacion = document.getElementById('ctrl-elevacion');

    if (ctrlPotencia) {
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
    }

    if (ctrlRotacion) {
        ctrlRotacion.addEventListener('input', () => {
            if (!grua) return;
            grua.rotacion = parseFloat(ctrlRotacion.value);
            document.getElementById('val-rotacion').textContent = grua.rotacion.toFixed(0) + '°';
            grua.actualizarPosiciones();
        });
    }

    if (ctrlExtension) {
        ctrlExtension.addEventListener('input', () => {
            if (!grua) return;
            grua.extension = parseFloat(ctrlExtension.value);
            document.getElementById('val-extension').textContent = grua.extension.toFixed(2);
            grua.actualizarPosiciones();
        });
    }

    if (ctrlElevacion) {
        ctrlElevacion.addEventListener('input', () => {
            if (!grua) return;
            grua.control = parseFloat(ctrlElevacion.value);
            document.getElementById('val-elevacion').textContent = grua.control.toFixed(2);
        });
    }

    const btnSoltarFlotante = document.getElementById('btn-soltar-flotante');
    if (btnSoltarFlotante) {
        btnSoltarFlotante.addEventListener('click', () => {
            if (grua) grua.soltarPeso();
        });
    }
}

// ============================================
// ACCIONES DESDE VR (llamadas desde escena.js y escenaPatio.js)
// ============================================
window.equiparGrua = function () {
    if (!estado.resultado) return;
    estado.equipada = true;

    // Crear la grúa si no existe
    if (!grua) {
        grua = new GruaElectromagnetica(escenaPatio);
    }
    grua.equipar(estado, estado.resultado);

    // Mostrar el panel flotante HTML
    const panel = document.getElementById('panel-grua-flotante');
    if (panel) panel.classList.add('visible');

    // Teletransportar al patio
    trasladarA('patio');

    console.log("🏗️ Modo grúa activado");
};

window.volverDiseno = function () {
    estado.equipada = false;
    if (grua) grua.soltarPeso();

    // Ocultar el panel flotante
    const panel = document.getElementById('panel-grua-flotante');
    if (panel) panel.classList.remove('visible');

    // Teletransportar al laboratorio
    trasladarA('lab');

    console.log("📐 Modo diseño activado");
};

// ============================================
// CONFIGURACIÓN DEL BOTÓN VR
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
                renderer.xr.setSession(session);
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
// INTERACCIÓN VR CON SLIDERS Y BOTONES
// ============================================
function conectarControladoresVR() {
    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);

        // Rayo visible
        const rayoGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -5)
        ]);
        const rayo = new THREE.Line(
            rayoGeometry,
            new THREE.LineBasicMaterial({ color: 0x4ecca3 })
        );
        controller.add(rayo);

        // Punto en la punta del rayo
        const punto = new THREE.Mesh(
            new THREE.SphereGeometry(0.01, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffcc00 })
        );
        punto.position.set(0, 0, -1);
        controller.add(punto);

        // Eventos
        controller.addEventListener('selectstart', () => onGatilloPresionado(controller));
        controller.addEventListener('selectend', () => onGatilloSoltado());

        xrRig.add(controller);
    }
}

let sliderVR_Activo = null;
const raycasterVR = new THREE.Raycaster();

function onGatilloPresionado(controller) {
    raycasterVR.setFromXRController(controller);
    raycasterVR.far = 8;

    // Buscar sliders
    let todosLosSliders = [];
    if (escena && escena.slidersVR) todosLosSliders = todosLosSliders.concat(escena.slidersVR);
    if (escenaPatio && escenaPatio.slidersVR) todosLosSliders = todosLosSliders.concat(escenaPatio.slidersVR);

    const intersectSliders = raycasterVR.intersectObjects(todosLosSliders, false);
    if (intersectSliders.length > 0) {
        sliderVR_Activo = intersectSliders[0].object;
        return;
    }

    // Buscar botones cicladores (solo laboratorio)
    if (escena && escena.botonesCiclicos) {
        const intersectBotones = raycasterVR.intersectObjects(escena.botonesCiclicos, true);
        if (intersectBotones.length > 0) {
            let obj = intersectBotones[0].object;
            while (obj && !obj.userData.esBotonCiclico && obj.parent) obj = obj.parent;
            if (obj && obj.userData.esBotonCiclico) {
                ciclarBotonVR(obj);
                return;
            }
        }
    }

    // Buscar botones de acción (laboratorio + patio)
    let todosLosBotones = [];
    if (escena && escena.botonesAccion) todosLosBotones = todosLosBotones.concat(escena.botonesAccion);
    if (escenaPatio && escenaPatio.botonesAccion) todosLosBotones = todosLosBotones.concat(escenaPatio.botonesAccion);

    const intersectAccion = raycasterVR.intersectObjects(todosLosBotones, false);
    if (intersectAccion.length > 0) {
        let obj = intersectAccion[0].object;
        while (obj && !obj.userData.esBotonAccion && obj.parent) obj = obj.parent;
        if (obj && obj.userData.esBotonAccion) {
            ejecutarAccionVR(obj.userData.accion);
            return;
        }
    }
}

function onGatilloSoltado() {
    sliderVR_Activo = null;
}

function ciclarBotonVR(boton) {
    const tipo = boton.userData.tipoBoton;
    const opciones = boton.userData.opciones;
    const nuevoIndice = (boton.userData.indice + 1) % opciones.length;
    boton.userData.indice = nuevoIndice;
    const nuevoValor = opciones[nuevoIndice];

    // Actualizar texto
    const tm = boton.userData.textoMesh;
    if (tm) {
        const textura = tm.material.map;
        const canvas = textura.image;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, 512, 128);
        ctx.strokeStyle = '#4ecca3';
        ctx.lineWidth = 6;
        ctx.strokeRect(6, 6, 500, 116);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 52px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(nuevoValor).toUpperCase(), 256, 64);
        textura.needsUpdate = true;
    }

    // Aplicar al estado
    if (tipo === 'awg') {
        estado.awg = parseInt(nuevoValor);
        const sel = document.getElementById('calibre');
        if (sel) sel.value = nuevoValor;
    } else if (tipo === 'nucleo') {
        estado.nucleo = nuevoValor;
        const sel = document.getElementById('nucleo');
        if (sel) sel.value = nuevoValor;
    } else if (tipo === 'forma') {
        estado.forma = nuevoValor;
        const sel = document.getElementById('forma');
        if (sel) sel.value = nuevoValor;
    }
    actualizarTodo();
}

function ejecutarAccionVR(accion) {
    console.log('Acción VR:', accion);

    if (accion === 'guardar') {
        if (typeof generarInforme === 'function' && estado.resultado) {
            generarInforme(estado, estado.resultado);
        }
    } else if (accion === 'equipar') {
        window.equiparGrua();
    } else if (accion === 'volver') {
        window.volverDiseno();
    } else if (accion === 'soltar') {
        if (grua) grua.soltarPeso();
    }
}

// ============================================
// ACTUALIZAR SLIDER VR (llamado desde el loop)
// ============================================
function actualizarSliderVR(perilla, valorNuevo) {
    const min = perilla.userData.min;
    const max = perilla.userData.max;
    const valorClamp = Math.max(min, Math.min(max, valorNuevo));
    perilla.userData.valor = valorClamp;

    const rango = max - min;
    const t = rango > 0 ? (valorClamp - min) / rango : 0;
    perilla.position.x = -0.25 + t * 0.5;

    const ctxVal = perilla.userData.canvasVal.getContext('2d');
    ctxVal.clearRect(0, 0, 128, 64);
    ctxVal.fillStyle = 'rgba(0,0,0,0)';
    ctxVal.fillRect(0, 0, 128, 64);
    ctxVal.fillStyle = '#ffffff';
    ctxVal.font = 'bold 28px monospace';
    ctxVal.textAlign = 'center';
    ctxVal.textBaseline = 'middle';
    ctxVal.fillText(valorClamp.toFixed(1), 64, 32);
    perilla.userData.valorMesh.material.map.needsUpdate = true;

    const tipo = perilla.userData.tipo;
    if (tipo === 'longitud') {
        estado.longitud = valorClamp;
        const el = document.getElementById('longitud');
        if (el) el.value = valorClamp;
        const elv = document.getElementById('longitud-val');
        if (elv) elv.textContent = valorClamp.toFixed(1);
    } else if (tipo === 'diametro') {
        estado.diametro = valorClamp;
        const el = document.getElementById('diametro');
        if (el) el.value = valorClamp;
        const elv = document.getElementById('diametro-val');
        if (elv) elv.textContent = valorClamp.toFixed(1);
    } else if (tipo === 'vueltas') {
        estado.vueltas = Math.round(valorClamp);
        const el = document.getElementById('vueltas');
        if (el) el.value = valorClamp;
        const elv = document.getElementById('vueltas-val');
        if (elv) elv.textContent = Math.round(valorClamp);
    } else if (tipo === 'corriente' || tipo === 'potencia') {
        estado.corriente = valorClamp;
        const el = document.getElementById('corriente');
        if (el) el.value = valorClamp;
        const elv = document.getElementById('corriente-val');
        if (elv) elv.textContent = valorClamp.toFixed(1);
    } else if (tipo === 'rotacion' && grua) {
        grua.rotacion = valorClamp;
        grua.actualizarPosiciones();
    } else if (tipo === 'extension' && grua) {
        grua.extension = valorClamp;
        grua.actualizarPosiciones();
    } else if (tipo === 'elevacion' && grua) {
        grua.control = valorClamp;
    }

    actualizarTodo();
}

// ============================================
// LOOP PRINCIPAL
// ============================================
function loop(tiempo) {
    const dt = Math.min((tiempo - ultimoTiempoFrame) / 1000, 0.1);
    ultimoTiempoFrame = tiempo;

    // Actualizar la escena del laboratorio
    if (escena && estado.localActual === 'lab') {
        escena.actualizar(dt);
    }

    // Actualizar la escena del patio
    if (escenaPatio && estado.localActual === 'patio') {
        escenaPatio.actualizar(dt);
    }

    // Actualizar la grúa
    if (grua && grua.equipada && estado.localActual === 'patio') {
        const dtGrua = Math.min((tiempo - ultimoTiempoGrua) / 1000, 0.1);
        grua.actualizar(grua.control, dtGrua);
    }
    ultimoTiempoGrua = tiempo;

    // Actualizar sliders VR activos
    if (sliderVR_Activo && renderer.xr.isPresenting) {
        for (let i = 0; i < 2; i++) {
            const controller = renderer.xr.getController(i);
            raycasterVR.setFromXRController(controller);
            const intersect = raycasterVR.intersectObject(sliderVR_Activo.userData.grupoPadre, true);
            if (intersect.length > 0) {
                const puntoInterseccion = intersect[0].point;
                const local = sliderVR_Activo.userData.grupoPadre.worldToLocal(puntoInterseccion.clone());
                const t = Math.max(0, Math.min(1, (local.x + 0.25) / 0.5));
                const min = sliderVR_Activo.userData.min;
                const max = sliderVR_Activo.userData.max;
                const valorNuevo = min + t * (max - min);
                actualizarSliderVR(sliderVR_Activo, valorNuevo);
            }
        }
    }

    // Actualizar OrbitControls
    if (escena && escena.controls && estado.localActual === 'lab') {
        escena.controls.update();
    }
    if (escenaPatio && estado.localActual === 'patio' && escena && escena.controls) {
        escena.controls.update();
    }

    // Renderizar
    if (renderer && escena && escena.camera) {
        renderer.render(escena.scene, escena.camera);
    }
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

    // Crear renderer compartido
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    contenedor.appendChild(renderer.domElement);

    // Crear XRRig (solo se usa en VR)
    xrRig = new THREE.Group();
    xrRig.add(renderer.xr.getCamera());
    // NOTA: XRRig no se añade a la escena directamente, Three.js lo maneja.

    // Crear escena del laboratorio (Local 1)
    escena = new Escena3D(contenedor, renderer);

    // Crear escena del patio (Local 2)
    escenaPatio = new EscenaPatio(escena.scene);

    // Sonido
    sonido = new SonidoSimulador();

    // Crear grúa (pero no equipar todavía)
    grua = new GruaElectromagnetica(escenaPatio);
    escenaPatio.grua = grua;

    // Vincular sliders HTML
    vincularSlider('longitud', 'longitud');
    vincularSlider('diametro', 'diametro');
    vincularSlider('vueltas', 'vueltas', v => v.toFixed(0));
    vincularSlider('corriente', 'corriente');

    // Vincular selects HTML
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

    // Botones principales HTML
    document.getElementById('btn-guardar').addEventListener('click', () => {
        if (estado.resultado) generarInforme(estado, estado.resultado);
    });

    document.getElementById('btn-equipar').addEventListener('click', () => {
        window.equiparGrua();
    });

    document.getElementById('btn-volver').addEventListener('click', () => {
        window.volverDiseno();
    });

    document.getElementById('btn-soltar').addEventListener('click', () => {
        if (grua) grua.soltarPeso();
    });

    // Botón toggle panel HTML
    const panelControl = document.getElementById('panel-control');
    const btnToggle = document.getElementById('btn-toggle-panel');
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            if (panelControl.style.display === 'none') {
                panelControl.style.display = 'block';
                btnToggle.textContent = '📋 Ocultar panel';
            } else {
                panelControl.style.display = 'none';
                btnToggle.textContent = '📋 Mostrar panel';
            }
        });
    }

    // Resize
    window.addEventListener('resize', () => {
        if (escena && escena.camera) {
            const w = contenedor.clientWidth;
            const h = contenedor.clientHeight;
            escena.camera.aspect = w / h;
            escena.camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
    });

    // Conectar controles del panel HTML de grúa
    conectarControlesGrua();

    // Configurar botón VR
    configurarBotonVR();

    // Conectar controladores VR
    conectarControladoresVR();

    // Estado inicial: laboratorio visible, patio oculto
    escena.mostrar();
    if (escenaPatio) escenaPatio.ocultar();
    estado.localActual = 'lab';

    // Loop principal
    actualizarTodo();
    ultimoTiempoFrame = performance.now();
    ultimoTiempoGrua = performance.now();
    renderer.setAnimationLoop(loop);

    console.log("✅ Simulador iniciado correctamente");
    console.log("📐 Laboratorio activo. Pulsa 'Equipar en la Grúa' para ir al patio.");
});