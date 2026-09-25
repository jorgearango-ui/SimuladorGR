// ============================================
// LOCAL 2: PATIO INDUSTRIAL
// ============================================
// Este archivo maneja ÚNICAMENTE el patio industrial:
// - Suelo, cielo nocturno, contenedores, luces de obra
// - La grúa con sus pesos
// - Paneles VR de grúa (D, E, F)
// - Pantalla de valores de la grúa
// ============================================

class EscenaPatio {
    constructor(sceneCompartida) {
        this.scene = sceneCompartida;
        this.offsetX = VR_LOCAL_PATIO; // x = 100

        // Grupos del patio
        this.grupoIndustrial = new THREE.Group();
        this.grupoGrua = new THREE.Group();
        this.grupoPanelD = new THREE.Group();
        this.grupoPanelE = new THREE.Group();
        this.grupoPanelF = new THREE.Group();

        // Desplazar todos los grupos al Local 2
        this.grupoIndustrial.position.x = this.offsetX;
        this.grupoGrua.position.x = this.offsetX;
        this.grupoPanelD.position.x = this.offsetX;
        this.grupoPanelE.position.x = this.offsetX;
        this.grupoPanelF.position.x = this.offsetX;

        this.scene.add(this.grupoIndustrial);
        this.scene.add(this.grupoGrua);
        this.scene.add(this.grupoPanelD);
        this.scene.add(this.grupoPanelE);
        this.scene.add(this.grupoPanelF);

        // Luces del patio (cálidas, industriales)
        this.luzAmbiente = new THREE.AmbientLight(0xffffff, 0.4);
        this.luzAmbiente.position.x = this.offsetX;
        this.scene.add(this.luzAmbiente);

        this.luzTecho = new THREE.PointLight(0xffddaa, 0.8, 20, 2);
        this.luzTecho.position.set(this.offsetX, 8, 0);
        this.scene.add(this.luzTecho);

        this.luzDir1 = new THREE.DirectionalLight(0xffddaa, 0.8);
        this.luzDir1.position.set(this.offsetX + 1, 5, 1);
        this.luzDir1.castShadow = true;
        this.luzDir1.shadow.mapSize.width = 2048;
        this.luzDir1.shadow.mapSize.height = 2048;
        this.luzDir1.shadow.camera.left = -10;
        this.luzDir1.shadow.camera.right = 10;
        this.luzDir1.shadow.camera.top = 10;
        this.luzDir1.shadow.camera.bottom = -10;
        this.scene.add(this.luzDir1);

        this.luzDir2 = new THREE.DirectionalLight(0x88aaff, 0.3);
        this.luzDir2.position.set(this.offsetX - 1, 3, -1);
        this.scene.add(this.luzDir2);

        // Grua (referencia, se inicializa desde main.js)
        this.grua = null;

        // Sliders y botones VR del patio
        this.slidersVR = [];
        this.botonesAccion = [];

        // Construir
        this.crearPatioIndustrial();
        this.crearPanelD_GruaSliders();
        this.crearPanelE_GruaAcciones();
        this.crearPanelF_GruaValores();

        // Empezar oculto
        this.ocultar();
    }

    // ==========================================
    // PATIO INDUSTRIAL
    // ==========================================
    crearPatioIndustrial() {
        const grupo = this.grupoIndustrial;

        // Piso
        const piso = new THREE.Mesh(
            new THREE.PlaneGeometry(60, 60),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 })
        );
        piso.rotation.x = -Math.PI / 2;
        piso.receiveShadow = true;
        grupo.add(piso);

        // Rejilla
        const grid = new THREE.GridHelper(60, 120, 0x3a3a3a, 0x2a2a2a);
        grid.position.y = 0.002;
        grupo.add(grid);

        // Contenedores
        const coloresCont = [0xcc3333, 0x3333cc, 0x33cc33, 0xcccc33, 0xcc6633, 0x8833cc];
        for (let i = 0; i < 30; i++) {
            const w = 0.8 + Math.random() * 0.5;
            const hh = 0.4 + Math.random() * 0.2;
            const d = 0.6 + Math.random() * 0.3;
            const cont = new THREE.Mesh(
                new THREE.BoxGeometry(w, hh, d),
                new THREE.MeshStandardMaterial({
                    color: coloresCont[i % coloresCont.length],
                    roughness: 0.7, metalness: 0.3
                })
            );
            const angulo = (i / 30) * Math.PI * 2;
            const radio = 8 + Math.random() * 6;
            cont.position.set(Math.cos(angulo) * radio, hh / 2, Math.sin(angulo) * radio - 5);
            cont.rotation.y = Math.random() * Math.PI * 2;
            cont.castShadow = true;
            grupo.add(cont);

            // Apilar un segundo
            if (Math.random() > 0.5) {
                const cont2 = cont.clone();
                cont2.position.y = hh + hh / 2;
                cont2.material = new THREE.MeshStandardMaterial({
                    color: coloresCont[(i + 2) % coloresCont.length],
                    roughness: 0.7, metalness: 0.3
                });
                grupo.add(cont2);
            }
        }

        // Otras grúas lejanas al fondo
        for (let i = 0; i < 4; i++) {
            const x = -12 + i * 8;
            const z = -20;
            const mastil = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.15, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xaaaa00, metalness: 0.6 })
            );
            mastil.position.set(x, 4, z);
            grupo.add(mastil);

            const brazo2 = new THREE.Mesh(
                new THREE.BoxGeometry(6, 0.15, 0.15),
                new THREE.MeshStandardMaterial({ color: 0xaaaa00, metalness: 0.6 })
            );
            brazo2.position.set(x + 3, 8, z);
            grupo.add(brazo2);
        }

        // Luces de obra
        for (let i = 0; i < 12; i++) {
            const angulo = (i / 12) * Math.PI * 2;
            const radio = 15;
            const posteLuz = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.05, 4, 6),
                new THREE.MeshStandardMaterial({ color: 0x666666 })
            );
            posteLuz.position.set(Math.cos(angulo) * radio, 2, Math.sin(angulo) * radio);
            grupo.add(posteLuz);

            const bombilla = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0xffffaa })
            );
            bombilla.position.set(Math.cos(angulo) * radio, 4, Math.sin(angulo) * radio);
            grupo.add(bombilla);

            const luzObra = new THREE.PointLight(0xffee88, 0.8, 15, 2);
            luzObra.position.copy(bombilla.position);
            grupo.add(luzObra);
        }

        // Cielo nocturno con estrellas
        const geoEstrellas = new THREE.BufferGeometry();
        const numEstrellas = 500;
        const posiciones = new Float32Array(numEstrellas * 3);
        for (let i = 0; i < numEstrellas; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI / 2;
            const r = 80;
            posiciones[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            posiciones[i * 3 + 1] = r * Math.cos(phi) + 10;
            posiciones[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        geoEstrellas.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
        const estrellas = new THREE.Points(
            geoEstrellas,
            new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 })
        );
        grupo.add(estrellas);
    }

    // ==========================================
    // PANTALLA DE VALORES DE LA GRÚA (panel F)
    // ==========================================
    crearPanelF_GruaValores() {
        const grupo = this.grupoPanelF;

        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 1.1, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 })
        );
        panel.position.set(1.5, 1.5, 0);
        panel.rotation.y = -Math.PI / 3;
        grupo.add(panel);

        const borde = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 1.15, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x00ff88, metalness: 0.8, roughness: 0.3 })
        );
        borde.position.set(1.5, 1.5, -0.02);
        borde.rotation.y = -Math.PI / 3;
        grupo.add(borde);

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        this.ctxPanelF = canvas.getContext('2d');
        this.texturaPanelF = new THREE.CanvasTexture(canvas);
        this.dibujarPanelF();

        const pantalla = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.9),
            new THREE.MeshBasicMaterial({ map: this.texturaPanelF })
        );
        pantalla.position.set(1.42, 1.55, 0.05);
        pantalla.rotation.y = -Math.PI / 3;
        grupo.add(pantalla);
    }

    dibujarPanelF() {
        const ctx = this.ctxPanelF;
        if (!ctx) return;

        ctx.fillStyle = '#0a0f0a';
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 4;
        ctx.strokeRect(6, 6, 500, 500);

        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GRÚA', 256, 45);

        const r = estado.resultado;
        if (!r) {
            this.texturaPanelF.needsUpdate = true;
            return;
        }

        ctx.textAlign = 'left';
        ctx.font = 'bold 22px monospace';

        ctx.fillStyle = '#ffffff';
        ctx.fillText('V:', 30, 100);
        ctx.fillText('I:', 30, 145);
        ctx.fillText('B:', 30, 190);
        ctx.fillText('PESO MÁX:', 30, 235);
        ctx.fillText('TEMP:', 30, 280);
        ctx.fillText('FUERZA:', 30, 325);

        const colorTemp = estado.temperatura > 200 ? '#ff3333' : estado.temperatura > 100 ? '#ffaa00' : '#00ff88';

        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(`${r.V.toFixed(1)} V`, 480, 100);
        ctx.fillText(`${estado.corriente.toFixed(1)} A`, 480, 145);
        ctx.fillText(`${r.B_real.toExponential(2)} T`, 480, 190);
        ctx.fillText(`${(r.m_max_real * 1000).toFixed(2)} g`, 480, 235);
        ctx.fillStyle = colorTemp;
        ctx.fillText(`${estado.temperatura.toFixed(0)} °C`, 480, 280);
        ctx.fillStyle = '#ff8c00';
        ctx.fillText(`${r.F_real.toExponential(2)} N`, 480, 325);

        this.texturaPanelF.needsUpdate = true;
    }

    // ==========================================
    // CREAR SLIDER (recibe grupoPadre)
    // ==========================================
    crearSlider(grupoPadre, x, y, z, tipo, etiqueta, color, min, max, valorInicial, rotY) {
        const grupo = new THREE.Group();
        grupo.position.set(x, y, z);
        grupo.rotation.y = rotY || 0;
        grupo.userData.esSliderVR = true;
        grupo.userData.tipo = tipo;

        const carril = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.015, 0.015),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        grupo.add(carril);

        const riel = new THREE.Mesh(
            new THREE.BoxGeometry(0.52, 0.03, 0.03),
            new THREE.MeshStandardMaterial({ color: 0x555555 })
        );
        riel.position.z = -0.01;
        grupo.add(riel);

        const canvasEt = document.createElement('canvas');
        canvasEt.width = 512;
        canvasEt.height = 64;
        const ctxEt = canvasEt.getContext('2d');
        ctxEt.fillStyle = 'rgba(0,0,0,0)';
        ctxEt.fillRect(0, 0, 512, 64);
        ctxEt.fillStyle = '#ffcc00';
        ctxEt.font = 'bold 26px sans-serif';
        ctxEt.textAlign = 'left';
        ctxEt.textBaseline = 'middle';
        ctxEt.fillText(etiqueta, 5, 32);
        const texEt = new THREE.CanvasTexture(canvasEt);
        const etiquetaMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.06),
            new THREE.MeshBasicMaterial({ map: texEt, transparent: true })
        );
        etiquetaMesh.position.set(-0.05, 0.06, 0.02);
        grupo.add(etiquetaMesh);

        const perilla = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 16, 16),
            new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.5,
                roughness: 0.4,
                emissive: color,
                emissiveIntensity: 0.5
            })
        );
        perilla.userData.esSliderVR = true;
        perilla.userData.tipo = tipo;
        perilla.userData.min = min;
        perilla.userData.max = max;
        perilla.userData.valor = valorInicial;
        perilla.userData.grupoPadre = grupo;

        const rango = max - min;
        const t = rango > 0 ? (valorInicial - min) / rango : 0;
        perilla.position.set(-0.25 + t * 0.5, 0, 0);
        grupo.add(perilla);

        const canvasVal = document.createElement('canvas');
        canvasVal.width = 128;
        canvasVal.height = 64;
        const ctxVal = canvasVal.getContext('2d');
        ctxVal.fillStyle = 'rgba(0,0,0,0)';
        ctxVal.fillRect(0, 0, 128, 64);
        ctxVal.fillStyle = '#ffffff';
        ctxVal.font = 'bold 28px monospace';
        ctxVal.textAlign = 'center';
        ctxVal.textBaseline = 'middle';
        ctxVal.fillText(valorInicial.toFixed(1), 64, 32);
        const texVal = new THREE.CanvasTexture(canvasVal);
        const valorMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.18, 0.075),
            new THREE.MeshBasicMaterial({ map: texVal, transparent: true })
        );
        valorMesh.position.set(0.32, 0.06, 0.02);
        grupo.add(valorMesh);
        perilla.userData.valorMesh = valorMesh;
        perilla.userData.canvasVal = canvasVal;

        grupoPadre.add(grupo);
        this.slidersVR.push(perilla);
    }

    // ==========================================
    // CREAR BOTÓN DE ACCIÓN
    // ==========================================
    crearBotonAccion(grupoPadre, x, y, z, accion, etiqueta, color, rotY) {
        const grupo = new THREE.Group();
        grupo.position.set(x, y, z);
        grupo.rotation.y = rotY || 0;
        grupo.userData.esBotonAccion = true;
        grupo.userData.accion = accion;

        const caja = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.22, 0.06),
            new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.6,
                roughness: 0.4,
                emissive: color,
                emissiveIntensity: 0.3
            })
        );
        caja.userData.esBotonAccion = true;
        grupo.add(caja);

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, 512, 128);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(etiqueta, 256, 64);
        const textura = new THREE.CanvasTexture(canvas);
        const textoMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.55, 0.22),
            new THREE.MeshBasicMaterial({ map: textura, transparent: true })
        );
        textoMesh.position.set(0, 0, 0.035);
        textoMesh.userData.esBotonAccion = true;
        grupo.add(textoMesh);

        const zonaColision = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.3, 0.15),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        zonaColision.userData.esBotonAccion = true;
        grupo.add(zonaColision);

        grupoPadre.add(grupo);
        this.botonesAccion.push(zonaColision);
    }

    // ==========================================
    // PANEL D - Sliders de la grúa (frente)
    // ==========================================
    crearPanelD_GruaSliders() {
        const grupo = this.grupoPanelD;

        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 1.1, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 })
        );
        panel.position.set(0, 1.5, -1.4);
        grupo.add(panel);

        const borde = new THREE.Mesh(
            new THREE.BoxGeometry(0.95, 1.15, 0.02),
            new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.8, roughness: 0.3 })
        );
        borde.position.set(0, 1.5, -1.42);
        grupo.add(borde);

        const canvasTitulo = document.createElement('canvas');
        canvasTitulo.width = 512;
        canvasTitulo.height = 128;
        const ctxT = canvasTitulo.getContext('2d');
        ctxT.fillStyle = 'rgba(0,0,0,0)';
        ctxT.fillRect(0, 0, 512, 128);
        ctxT.fillStyle = '#ffcc00';
        ctxT.font = 'bold 44px sans-serif';
        ctxT.textAlign = 'center';
        ctxT.textBaseline = 'middle';
        ctxT.fillText('CONTROL GRÚA', 256, 64);
        const texT = new THREE.CanvasTexture(canvasTitulo);
        const titulo = new THREE.Mesh(
            new THREE.PlaneGeometry(0.7, 0.15),
            new THREE.MeshBasicMaterial({ map: texT, transparent: true })
        );
        titulo.position.set(0, 2.0, -1.36);
        grupo.add(titulo);

        this.crearSlider(grupo, 0, 1.82, -1.36, 'potencia', 'POTENCIA (A)', 0xff3333, 0, 30, estado.corriente, 0);
        this.crearSlider(grupo, 0, 1.62, -1.36, 'rotacion', 'ROTACIÓN', 0x33aaff, 0, 360, 0, 0);
        this.crearSlider(grupo, 0, 1.42, -1.36, 'extension', 'EXTENSIÓN', 0x33ff33, 0.2, 2.0, 1.0, 0);
        this.crearSlider(grupo, 0, 1.22, -1.36, 'elevacion', 'ELEVACIÓN', 0xffcc00, -1, 1, 0, 0);
    }

    // ==========================================
    // PANEL E - Botones de la grúa (izquierda)
    // ==========================================
    crearPanelE_GruaAcciones() {
        const grupo = this.grupoPanelE;

        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 1.1, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 })
        );
        panel.position.set(-1.5, 1.5, 0);
        panel.rotation.y = Math.PI / 3;
        grupo.add(panel);

        const borde = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 1.15, 0.02),
            new THREE.MeshStandardMaterial({ color: 0xff3333, metalness: 0.8, roughness: 0.3 })
        );
        borde.position.set(-1.5, 1.5, -0.02);
        borde.rotation.y = Math.PI / 3;
        grupo.add(borde);

        const canvasTitulo = document.createElement('canvas');
        canvasTitulo.width = 512;
        canvasTitulo.height = 128;
        const ctxT = canvasTitulo.getContext('2d');
        ctxT.fillStyle = 'rgba(0,0,0,0)';
        ctxT.fillRect(0, 0, 512, 128);
        ctxT.fillStyle = '#ff3333';
        ctxT.font = 'bold 44px sans-serif';
        ctxT.textAlign = 'center';
        ctxT.textBaseline = 'middle';
        ctxT.fillText('ACCIONES', 256, 64);
        const texT = new THREE.CanvasTexture(canvasTitulo);
        const titulo = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.15),
            new THREE.MeshBasicMaterial({ map: texT, transparent: true })
        );
        titulo.position.set(-1.42, 2.0, 0.08);
        titulo.rotation.y = Math.PI / 3;
        grupo.add(titulo);

        this.crearBotonAccion(grupo, -1.42, 1.75, 0.08, 'soltar', '🔓 SOLTAR', 0xff3333, Math.PI / 3);
        this.crearBotonAccion(grupo, -1.42, 1.45, 0.08, 'volver', '↩️ VOLVER', 0x4ecca3, Math.PI / 3);
    }

    // ==========================================
    // MOSTRAR / OCULTAR
    // ==========================================
    mostrar() {
        this.grupoIndustrial.visible = true;
        this.grupoGrua.visible = true;
        this.grupoPanelD.visible = true;
        this.grupoPanelE.visible = true;
        this.grupoPanelF.visible = true;

        this.luzAmbiente.intensity = 0.4;
        this.luzTecho.intensity = 0.8;
    }

    ocultar() {
        this.grupoIndustrial.visible = false;
        this.grupoGrua.visible = false;
        this.grupoPanelD.visible = false;
        this.grupoPanelE.visible = false;
        this.grupoPanelF.visible = false;
    }

    // ==========================================
    // ACTUALIZAR (llamado desde main.js)
    // ==========================================
    actualizar(dt) {
        // Actualizar la pantalla de la grúa
        this.dibujarPanelF();
    }
}