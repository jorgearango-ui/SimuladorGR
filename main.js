// ============================================
// MÓDULO PRINCIPAL
// ============================================

let escena = null;
let escenaPatio = null;
let grua = null;
let renderer = null;

let ultimoTiempoGrua = 0;
let ultimoTiempoFrame = 0;
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
    modo: 'diseno',
    localActual: 'lab'
};

window.estadoModo = 'diseno';

// ============================================
// TELETRANSPORTE ENTRE LOCALES
// ============================================
function trasladarA(local) {
    if (estado.localActual === local) return;

    const fade = document.getElementById('fade-transicion');
    if (!fade) return;

    fade.classList.add('activo');

    if (sonido) {
        sonido.iniciado = true;
        sonido.whoosh();
    }

    setTimeout(() => {
        if (local === 'patio') {
            if (escena) escena.ocultar();
            if (escenaPatio) escenaPatio.mostrar();
            estado.localActual = 'patio';
            estado.modo = 'grua';

            document.getElementById('modo-indicador').textContent = '🏗️ PATIO INDUSTRIAL';
            document.getElementById('modo-indicador').style.color = '#ff8c00';

            if (escena && escena.camera) {
                escena.camera.position.set(0.5, 2.5, 9);
                if (escena.controls) {
                    escena.controls.target.set(-0.3, 1.0, 2.5);
                    escena.controls.update();
                }
            }
        } else {
            if (escenaPatio) escenaPatio.ocultar();
            if (escena) escena.mostrar();
            estado.localActual = 'lab';
            estado.modo = 'diseno';

            document.getElementById('modo-indicador').textContent = '📐 LABORATORIO';
            document.getElementById('modo-indicador').style.color = '#4ecca3';

            if (escena && escena.camera) {
                escena.camera.position.set(0.5, 1.5, 2.5);
                if (escena.controls) {
                    escena.controls.target.set(0, 1.3, 0);
                    escena.controls.update();
                }
            }
        }

        setTimeout(() => {
            fade.classList.remove('activo');
        }, 300);
    }, 500);
}

// ============================================
// VINCULACIÓN DE CONTROLES
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

    if (estado.localActual === 'lab' && escena) {
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
// CONTROLES HTML DE LA GRÚA
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
// ACCIONES DESDE VR
// ============================================
window.equiparGrua = function () {
    if (!estado.resultado) return;
    estado.equipada = true;

    if (!grua) {
        grua = new GruaElectromagnetica(escenaPatio);
    }
    grua.equipar(estado, estado.resultado);

    const panel = document.getElementById('panel-grua-flotante');
    if (panel) panel.classList.add('visible');

    trasladarA('patio');
    console.log("🏗️ Modo grúa activado");
};

window.volverDiseno = function () {
    estado.equipada = false;
    if (grua) grua.soltarPeso();

    const panel = document.getElementById('panel-grua-flotante');
    if (panel) panel.classList.remove('visible');

    trasladarA('lab');
    console.log("📐 Modo diseño activado");
};

// ============================================
// BOTÓN VR
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

                // Reposicionar paneles delante del jugador al entrar en VR
                setTimeout(() => {
                    if (escena && escena.grupoPanelA) {
                        // Los paneles ya están en (0, 1.5, -1.4) que es donde el jugador
                        // debería estar mirando al entrar en VR.
                        console.log("📐 Paneles VR listos");
                    }
                }, 500);

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
// INTERACCIÓN CON EL MOUSE (PC)
// ============================================
function configurarMousePC() {
    const canvas = renderer.domElement;
    const raycasterMouse = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();
    let sliderMouseActivo = null;

    function actualizarMouseNDC(event) {
        const rect = canvas.getBoundingClientRect();
        mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    canvas.addEventListener('mousedown', (event) => {
        if (renderer.xr.isPresenting) return;
        if (event.button !== 0) return;

        actualizarMouseNDC(event);
        raycasterMouse.setFromCamera(mouseNDC, escena.camera);

        // 1. Sliders
        let todosLosSliders = [];
        if (escena && escena.slidersVR) todosLosSliders = todosLosSliders.concat(escena.slidersVR);
        if (escenaPatio && escenaPatio.slidersVR) todosLosSliders = todosLosSliders.concat(escenaPatio.slidersVR);

        const intersectSliders = raycasterMouse.intersectObjects(todosLosSliders, true);
        if (intersectSliders.length > 0) {
            let obj = intersectSliders[0].object;
            while (obj && !obj.userData.esSliderVR && obj.parent) obj = obj.parent;
            if (obj && obj.userData.esSliderVR) {
                sliderMouseActivo = obj;
                return;
            }
        }

        // 2. Botones cicladores
        if (escena && escena.botonesCiclicos) {
            const intersectBotones = raycasterMouse.intersectObjects(escena.botonesCiclicos, true);
            if (intersectBotones.length > 0) {
                let obj = intersectBotones[0].object;
                while (obj && !obj.userData.esBotonCiclico && obj.parent) obj = obj.parent;
                if (obj && obj.userData.esBotonCiclico) {
                    ciclarBotonVR(obj);
                    return;
                }
            }
        }

        // 3. Botones de acción
        let todosLosBotones = [];
        if (escena && escena.botonesAccion) todosLosBotones = todosLosBotones.concat(escena.botonesAccion);
        if (escenaPatio && escenaPatio.botonesAccion) todosLosBotones = todosLosBotones.concat(escenaPatio.botonesAccion);

        const intersectAccion = raycasterMouse.intersectObjects(todosLosBotones, false);
        if (intersectAccion.length > 0) {
            let obj = intersectAccion[0].object;
            while (obj && !obj.userData.esBotonAccion && obj.parent) obj = obj.parent;
            if (obj && obj.userData.esBotonAccion) {
                ejecutarAccionVR(obj.userData.accion);
                return;
            }
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        if (renderer.xr.isPresenting) return;

        if (sliderMouseActivo) {
            const dx = event.movementX || 0;
            const delta = dx * 0.005;
            const min = sliderMouseActivo.userData.min;
            const max = sliderMouseActivo.userData.max;
            const valorActual = sliderMouseActivo.userData.valor;
            const rango = max - min;
            const nuevoValor = Math.max(min, Math.min(max, valorActual + delta * rango * 0.02));
            actualizarSliderVR(sliderMouseActivo, nuevoValor);
            return;
        }

        actualizarMouseNDC(event);
        raycasterMouse.setFromCamera(mouseNDC, escena.camera);

        let sobreAlgo = false;

        let todosLosSliders = [];
        if (escena && escena.slidersVR) todosLosSliders = todosLosSliders.concat(escena.slidersVR);
        if (escenaPatio && escenaPatio.slidersVR) todosLosSliders = todosLosSliders.concat(escenaPatio.slidersVR);
        if (raycasterMouse.intersectObjects(todosLosSliders, true).length > 0) sobreAlgo = true;

        if (!sobreAlgo && escena && escena.botonesCiclicos) {
            if (raycasterMouse.intersectObjects(escena.botonesCiclicos, true).length > 0) sobreAlgo = true;
        }

        if (!sobreAlgo) {
            let todosLosBotones = [];
            if (escena && escena.botonesAccion) todosLosBotones = todosLosBotones.concat(escena.botonesAccion);
            if (escenaPatio && escenaPatio.botonesAccion) todosLosBotones = todosLosBotones.concat(escenaPatio.botonesAccion);
            if (raycasterMouse.intersectObjects(todosLosBotones, false).length > 0) sobreAlgo = true;
        }

        canvas.style.cursor = sobreAlgo ? 'pointer' : 'default';
    });

    window.addEventListener('mouseup', () => {
        sliderMouseActivo = null;
    });
}

// ============================================
// CONTROLADORES VR
// ============================================
function conectarControladoresVR() {
    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);

        const rayoGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -5)
        ]);
        const rayo = new THREE.Line(
            rayoGeometry,
            new THREE.LineBasicMaterial({ color: 0x4ecca3 })
        );
        controller.add(rayo);

        const punto = new THREE.Mesh(
            new THREE.SphereGeometry(0.01, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffcc00 })
        );
        punto.position.set(0, 0, -1);
        controller.add(punto);

        controller.addEventListener('selectstart', () => onGatilloPresionado(controller));
        controller.addEventListener('selectend', () => onGatilloSoltado());

        escena.scene.add(controller);
    }

    configurarMousePC();
}

let sliderVR_Activo = null;
const raycasterVR = new THREE.Raycaster();

function onGatilloPresionado(controller) {
    raycasterVR.setFromXRController(controller);
    raycasterVR.far = 8;

    let todosLosSliders = [];
    if (escena && escena.slidersVR) todosLosSliders = todosLosSliders.concat(escena.slidersVR);
    if (escenaPatio && escenaPatio.slidersVR) todosLosSliders = todosLosSliders.concat(escenaPatio.slidersVR);

    const intersectSliders = raycasterVR.intersectObjects(todosLosSliders, true);
    if (intersectSliders.length > 0) {
        sliderVR_Activo = intersectSliders[0].object;
        return;
    }

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
    console.log('Acción:', accion);
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
// LOOP
// ============================================
function loop(tiempo) {
    const dt = Math.min((tiempo - ultimoTiempoFrame) / 1000, 0.1);
    ultimoTiempoFrame = tiempo;

    if (escena && estado.localActual === 'lab') {
        escena.actualizar(dt);
    }

    if (escenaPatio && estado.localActual === 'patio') {
        escenaPatio.actualizar(dt);
    }

    if (grua && grua.equipada && estado.localActual === 'patio') {
        const dtGrua = Math.min((tiempo - ultimoTiempoGrua) / 1000, 0.1);
        grua.actualizar(grua.control, dtGrua);
    }
    ultimoTiempoGrua = tiempo;

    if (sliderVR_Activo && renderer.xr.isPresenting) {
    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);
        raycasterVR.setFromXRController(controller);
        raycasterVR.far = 10;

        // Detectar intersección con el CARRIL del slider (más grande que la perilla)
        const intersect = raycasterVR.intersectObject(sliderVR_Activo.userData.grupoPadre, true);
        if (intersect.length > 0) {
            const puntoInterseccion = intersect[0].point;

            // Transformar el punto del mundo al sistema local del grupo del slider
            const puntoLocal = sliderVR_Activo.userData.grupoPadre.worldToLocal(puntoInterseccion.clone());

            // La perilla se mueve entre -0.25 y 0.25 en X del grupo
            const rangoLocal = 0.5; // -0.25 a 0.25
            const t = Math.max(0, Math.min(1, (puntoLocal.x + 0.25) / rangoLocal));

            const min = sliderVR_Activo.userData.min;
            const max = sliderVR_Activo.userData.max;
            const valorNuevo = min + t * (max - min);

            actualizarSliderVR(sliderVR_Activo, valorNuevo);
        }
    }
}

    if (escena && escena.controls) {
        escena.controls.update();
    }

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

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    contenedor.appendChild(renderer.domElement);

    escena = new Escena3D(contenedor, renderer);
    escenaPatio = new EscenaPatio(escena.scene);

    sonido = new SonidoSimulador();

    grua = new GruaElectromagnetica(escenaPatio);
    escenaPatio.grua = grua;

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

    document.getElementById('btn-equipar').addEventListener('click', () => {
        window.equiparGrua();
    });

    document.getElementById('btn-volver').addEventListener('click', () => {
        window.volverDiseno();
    });

    document.getElementById('btn-soltar').addEventListener('click', () => {
        if (grua) grua.soltarPeso();
    });

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

    window.addEventListener('resize', () => {
        if (escena && escena.camera) {
            const w = contenedor.clientWidth;
            const h = contenedor.clientHeight;
            escena.camera.aspect = w / h;
            escena.camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
    });

    conectarControlesGrua();
    configurarBotonVR();
    conectarControladoresVR();

    escena.mostrar();
    if (escenaPatio) escenaPatio.ocultar();
    estado.localActual = 'lab';

    actualizarTodo();
    ultimoTiempoFrame = performance.now();
    ultimoTiempoGrua = performance.now();
    renderer.setAnimationLoop(loop);

    console.log("✅ Simulador iniciado correctamente");
});