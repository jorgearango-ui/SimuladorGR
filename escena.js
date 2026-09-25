// ============================================
// LOCAL 1: LABORATORIO
// ============================================

class Escena3D {
    constructor(contenedor, rendererCompartido) {
        this.contenedor = contenedor;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);

        this.renderer = rendererCompartido;

        this.camera = new THREE.PerspectiveCamera(
            60,
            contenedor.clientWidth / contenedor.clientHeight,
            0.01,
            300
        );
        this.camera.position.set(0.5, 1.5, 2.5);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 1.3, 0);

        // Luces del laboratorio
        this.luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.luzAmbiente);

        this.luzTecho = new THREE.PointLight(0xffeecc, 1.5, 8, 2);
        this.luzTecho.position.set(0, 3.5, 0);
        this.scene.add(this.luzTecho);

        this.luzDir1 = new THREE.DirectionalLight(0xffffff, 0.8);
        this.luzDir1.position.set(1, 3, 1);
        this.luzDir1.castShadow = true;
        this.luzDir1.shadow.mapSize.width = 1024;
        this.luzDir1.shadow.mapSize.height = 1024;
        this.luzDir1.shadow.camera.left = -4;
        this.luzDir1.shadow.camera.right = 4;
        this.luzDir1.shadow.camera.top = 4;
        this.luzDir1.shadow.camera.bottom = -4;
        this.scene.add(this.luzDir1);

        this.luzDir2 = new THREE.DirectionalLight(0x88bbff, 0.3);
        this.luzDir2.position.set(-1, 1, -1);
        this.scene.add(this.luzDir2);

        // Grupos
        this.grupoLaboratorio = new THREE.Group();
        this.grupoEscena = new THREE.Group();
        this.grupoCampo = new THREE.Group();
        this.grupoElectrones = new THREE.Group();
        this.grupoParticulasCampo = new THREE.Group();
        this.grupoExplosion = new THREE.Group();
        this.grupoPantallaValores = new THREE.Group();
        this.grupoPanelA = new THREE.Group();
        this.grupoPanelB = new THREE.Group();
        this.grupoPanelC = new THREE.Group();

        this.scene.add(this.grupoLaboratorio);
        this.scene.add(this.grupoEscena);
        this.scene.add(this.grupoCampo);
        this.scene.add(this.grupoElectrones);
        this.scene.add(this.grupoParticulasCampo);
        this.scene.add(this.grupoExplosion);
        this.scene.add(this.grupoPantallaValores);
        this.scene.add(this.grupoPanelA);
        this.scene.add(this.grupoPanelB);
        this.scene.add(this.grupoPanelC);

        this.electrones = [];
        this.lineasCampo = [];
        this.particulasCampo = [];
        this.particulasExplosion = [];
        this.tiempo = 0;
        this.formaActual = 'barra';

        this.slidersVR = [];
        this.botonesCiclicos = [];
        this.botonesAccion = [];

        this.crearLaboratorio();
        this.crearPantallaValores();
        this.crearPanelA_Sliders();
        this.crearPanelB_Botones();
        this.crearPanelC_Acciones();
    }

    crearLaboratorio() {
        const grupo = this.grupoLaboratorio;

        const piso = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 12),
            new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.9, metalness: 0.1 })
        );
        piso.rotation.x = -Math.PI / 2;
        piso.receiveShadow = true;
        grupo.add(piso);

        const grid = new THREE.GridHelper(12, 120, 0x555566, 0x444455);
        grid.position.y = 0.002;
        grupo.add(grid);

        const paredMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.95 });
        const paredFondo = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), paredMat);
        paredFondo.position.set(0, 2.5, -4);
        grupo.add(paredFondo);
        const paredIzq = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), paredMat);
        paredIzq.rotation.y = Math.PI / 2;
        paredIzq.position.set(-4, 2.5, 0);
        grupo.add(paredIzq);
        const paredDer = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), paredMat);
        paredDer.rotation.y = -Math.PI / 2;
        paredDer.position.set(4, 2.5, 0);
        grupo.add(paredDer);
        const techo = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), paredMat);
        techo.rotation.x = Math.PI / 2;
        techo.position.y = 5;
        grupo.add(techo);

        for (let i = -1; i <= 1; i++) {
            const lamparaCaja = new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 0.1, 0.3),
                new THREE.MeshStandardMaterial({ color: 0xeeeeee, emissive: 0xffffcc, emissiveIntensity: 0.8 })
            );
            lamparaCaja.position.set(i * 2, 4.9, 0);
            grupo.add(lamparaCaja);

            const luzLamp = new THREE.PointLight(0xffeecc, 1.0, 8, 2);
            luzLamp.position.set(i * 2, 4.7, 0);
            grupo.add(luzLamp);
        }

        const estanteMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.5 });
        for (let nivel = 0; nivel < 4; nivel++) {
            const estante = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.03, 0.3), estanteMat);
            estante.position.set(-3, 1.0 + nivel * 0.7, -3.5);
            grupo.add(estante);
        }

        const colores = [0xff6666, 0x66ff66, 0x6666ff, 0xffff66, 0xff66ff, 0x66ffff];
        colores.forEach((c, i) => {
            const caja = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, 0.2, 0.2),
                new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.4 })
            );
            caja.position.set(-3.5 + (i % 3) * 0.5, 1.15 + Math.floor(i / 3) * 0.7, -3.4);
            grupo.add(caja);
        });
    }

    crearPantallaValores() {
        const grupo = this.grupoPantallaValores;

        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        this.ctxPantallaValores = canvas.getContext('2d');
        this.texturaPantallaValores = new THREE.CanvasTexture(canvas);
        this.dibujarPantallaValores();

        const pantalla = new THREE.Mesh(
            new THREE.PlaneGeometry(1.6, 0.4),
            new THREE.MeshBasicMaterial({ map: this.texturaPantallaValores })
        );
        pantalla.position.set(0, 0.95, 0.43);
        pantalla.rotation.x = -Math.PI / 4;
        grupo.add(pantalla);
    }

    dibujarPantallaValores() {
        const ctx = this.ctxPantallaValores;
        if (!ctx) return;

        const r = estado.resultado;

        ctx.fillStyle = '#0a0f0a';
        ctx.fillRect(0, 0, 1024, 256);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.strokeRect(6, 6, 1012, 244);

        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MEDICIONES', 512, 30);

        if (!r) {
            this.texturaPantallaValores.needsUpdate = true;
            return;
        }

        ctx.textAlign = 'left';
        ctx.font = 'bold 18px monospace';

        const colorTemp = estado.temperatura > 200 ? '#ff3333' : estado.temperatura > 100 ? '#ffaa00' : '#00ff88';

        ctx.fillStyle = '#66ccff';
        ctx.fillText('⚙️ IDEAL', 30, 65);
        ctx.fillStyle = '#ff8c00';
        ctx.fillText('🔬 REALISTA', 530, 65);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px monospace';

        ctx.fillText(`V: ${r.V.toFixed(2)} V`, 30, 95);
        ctx.fillText(`B: ${r.B_ideal.toFixed(4)} T`, 30, 118);
        ctx.fillText(`F: ${r.F_ideal.toFixed(2)} N`, 30, 141);
        ctx.fillText(`Peso máx: ${r.m_max_ideal.toFixed(2)} kg`, 30, 164);
        ctx.fillText(`Saturación: ${r.saturado ? 'SÍ ⚠️' : 'No'}`, 30, 187);

        ctx.fillStyle = '#ff8c00';
        ctx.fillText(`B: ${r.B_real.toExponential(3)} T`, 530, 95);
        ctx.fillText(`F: ${r.F_real.toExponential(3)} N`, 530, 118);
        ctx.fillText(`Peso máx: ${(r.m_max_real * 1000).toFixed(3)} g`, 530, 141);
        ctx.fillText(`Factor k: ${r.k.toFixed(4)}`, 530, 164);

        ctx.fillStyle = colorTemp;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`🌡️ ${estado.temperatura.toFixed(0)} °C`, 512, 230);

        this.texturaPantallaValores.needsUpdate = true;
    }

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

    crearBotonCiclico(grupoPadre, x, y, z, tipo, etiqueta, valorInicial, opciones, indiceInicial, rotY) {
        const grupo = new THREE.Group();
        grupo.position.set(x, y, z);
        grupo.rotation.y = rotY || 0;
        grupo.userData.esBotonCiclico = true;
        grupo.userData.tipoBoton = tipo;
        grupo.userData.opciones = opciones;
        grupo.userData.indice = indiceInicial;

        const caja = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.15, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.4 })
        );
        caja.userData.esBotonCiclico = true;
        grupo.add(caja);

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
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
        ctx.fillText(String(valorInicial).toUpperCase(), 256, 64);
        const textura = new THREE.CanvasTexture(canvas);
        const textoMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.4, 0.15),
            new THREE.MeshBasicMaterial({ map: textura, transparent: true })
        );
        textoMesh.position.set(0, 0, 0.028);
        textoMesh.userData.esBotonCiclico = true;
        grupo.add(textoMesh);

        const canvasEt = document.createElement('canvas');
        canvasEt.width = 512;
        canvasEt.height = 64;
        const ctxEt = canvasEt.getContext('2d');
        ctxEt.fillStyle = 'rgba(0,0,0,0)';
        ctxEt.fillRect(0, 0, 512, 64);
        ctxEt.fillStyle = '#ffcc00';
        ctxEt.font = 'bold 30px sans-serif';
        ctxEt.textAlign = 'center';
        ctxEt.textBaseline = 'middle';
        ctxEt.fillText(etiqueta, 256, 32);
        const texEt = new THREE.CanvasTexture(canvasEt);
        const etiquetaMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.35, 0.05),
            new THREE.MeshBasicMaterial({ map: texEt, transparent: true })
        );
        etiquetaMesh.position.set(0, 0.11, 0.028);
        grupo.add(etiquetaMesh);

        grupo.userData.textoMesh = textoMesh;
        grupo.userData.textura = textura;

        grupoPadre.add(grupo);
        this.botonesCiclicos.push(grupo);
    }

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

    crearPanelA_Sliders() {
        const grupo = this.grupoPanelA;

        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 1.1, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 })
        );
        panel.position.set(0, 1.5, -1.4);
        grupo.add(panel);

        const borde = new THREE.Mesh(
            new THREE.BoxGeometry(0.95, 1.15, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x4ecca3, metalness: 0.8, roughness: 0.3 })
        );
        borde.position.set(0, 1.5, -1.42);
        grupo.add(borde);

        const canvasTitulo = document.createElement('canvas');
        canvasTitulo.width = 512;
        canvasTitulo.height = 128;
        const ctxT = canvasTitulo.getContext('2d');
        ctxT.fillStyle = 'rgba(0,0,0,0)';
        ctxT.fillRect(0, 0, 512, 128);
        ctxT.fillStyle = '#4ecca3';
        ctxT.font = 'bold 48px sans-serif';
        ctxT.textAlign = 'center';
        ctxT.textBaseline = 'middle';
        ctxT.fillText('DISEÑO', 256, 64);
        const texT = new THREE.CanvasTexture(canvasTitulo);
        const titulo = new THREE.Mesh(
            new THREE.PlaneGeometry(0.7, 0.15),
            new THREE.MeshBasicMaterial({ map: texT, transparent: true })
        );
        titulo.position.set(0, 2.0, -1.36);
        grupo.add(titulo);

        this.crearSlider(grupo, 0, 1.82, -1.36, 'longitud', 'LONGITUD (cm)', 0x4ecca3, 2, 30, estado.longitud, 0);
        this.crearSlider(grupo, 0, 1.62, -1.36, 'diametro', 'DIÁMETRO (cm)', 0x4ecca3, 1, 15, estado.diametro, 0);
        this.crearSlider(grupo, 0, 1.42, -1.36, 'vueltas', 'VUELTAS', 0x4ecca3, 10, 3000, estado.vueltas, 0);
        this.crearSlider(grupo, 0, 1.22, -1.36, 'corriente', 'CORRIENTE (A)', 0xff3333, 0, 30, estado.corriente, 0);
    }

    crearPanelB_Botones() {
        const grupo = this.grupoPanelB;

        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 1.1, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 })
        );
        panel.position.set(-1.5, 1.5, 0);
        panel.rotation.y = Math.PI / 3;
        grupo.add(panel);

        const borde = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 1.15, 0.02),
            new THREE.MeshStandardMaterial({ color: 0xff8c00, metalness: 0.8, roughness: 0.3 })
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
        ctxT.fillStyle = '#ff8c00';
        ctxT.font = 'bold 40px sans-serif';
        ctxT.textAlign = 'center';
        ctxT.textBaseline = 'middle';
        ctxT.fillText('MATERIALES', 256, 64);
        const texT = new THREE.CanvasTexture(canvasTitulo);
        const titulo = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.15),
            new THREE.MeshBasicMaterial({ map: texT, transparent: true })
        );
        titulo.position.set(-1.42, 2.0, 0.08);
        titulo.rotation.y = Math.PI / 3;
        grupo.add(titulo);

        const indiceAwg = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28].indexOf(estado.awg);
        const indiceNucleo = ['aire', 'hierro', 'ferrita', 'silicio', 'permalloy'].indexOf(estado.nucleo);
        const indiceForma = ['barra', 'u', 'toroidal', 'aire'].indexOf(estado.forma);

        this.crearBotonCiclico(grupo, -1.42, 1.82, 0.08, 'awg', 'CALIBRE (AWG)', 'AWG ' + estado.awg, [10, 12, 14, 16, 18, 20, 22, 24, 26, 28], indiceAwg >= 0 ? indiceAwg : 5, Math.PI / 3);
        this.crearBotonCiclico(grupo, -1.42, 1.55, 0.08, 'nucleo', 'NÚCLEO', estado.nucleo.toUpperCase(), ['aire', 'hierro', 'ferrita', 'silicio', 'permalloy'], indiceNucleo >= 0 ? indiceNucleo : 1, Math.PI / 3);
        this.crearBotonCiclico(grupo, -1.42, 1.28, 0.08, 'forma', 'FORMA', estado.forma.toUpperCase(), ['barra', 'u', 'toroidal', 'aire'], indiceForma >= 0 ? indiceForma : 0, Math.PI / 3);
    }

    crearPanelC_Acciones() {
        const grupo = this.grupoPanelC;

        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 1.1, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 })
        );
        panel.position.set(1.5, 1.5, 0);
        panel.rotation.y = -Math.PI / 3;
        grupo.add(panel);

        const borde = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 1.15, 0.02),
            new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.8, roughness: 0.3 })
        );
        borde.position.set(1.5, 1.5, -0.02);
        borde.rotation.y = -Math.PI / 3;
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
        ctxT.fillText('ACCIONES', 256, 64);
        const texT = new THREE.CanvasTexture(canvasTitulo);
        const titulo = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.15),
            new THREE.MeshBasicMaterial({ map: texT, transparent: true })
        );
        titulo.position.set(1.42, 2.0, 0.08);
        titulo.rotation.y = -Math.PI / 3;
        grupo.add(titulo);

        this.crearBotonAccion(grupo, 1.42, 1.75, 0.08, 'guardar', '💾 GUARDAR', 0x4ecca3, -Math.PI / 3);
        this.crearBotonAccion(grupo, 1.42, 1.45, 0.08, 'equipar', '🏗️ EQUIPAR', 0xffcc00, -Math.PI / 3);
    }

    dibujarEscenaDiseno(params, resultado) {
        while (this.grupoEscena.children.length > 0) {
            this.grupoEscena.remove(this.grupoEscena.children[0]);
        }
        const h = params.longitud / 100;
        const D = params.diametro / 100;
        const r = resultado;

        const anchoMesa = 1.4;
        const fondoMesa = 0.8;
        const altoMesa = 0.05;
        const alturaPatas = 0.875;

        const mesaSuperficie = new THREE.Mesh(
            new THREE.BoxGeometry(anchoMesa, altoMesa, fondoMesa),
            new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.85 })
        );
        mesaSuperficie.position.y = alturaPatas;
        mesaSuperficie.castShadow = true;
        mesaSuperficie.receiveShadow = true;
        this.grupoEscena.add(mesaSuperficie);

        const pataGeo = new THREE.BoxGeometry(0.05, alturaPatas, 0.05);
        const pataMat = new THREE.MeshStandardMaterial({ color: 0x3a2410 });
        [[-anchoMesa/2+0.05, alturaPatas/2, -fondoMesa/2+0.05],
         [ anchoMesa/2-0.05, alturaPatas/2, -fondoMesa/2+0.05],
         [-anchoMesa/2+0.05, alturaPatas/2,  fondoMesa/2-0.05],
         [ anchoMesa/2-0.05, alturaPatas/2,  fondoMesa/2-0.05]].forEach(pos => {
            const pata = new THREE.Mesh(pataGeo, pataMat);
            pata.position.set(pos[0], pos[1], pos[2]);
            pata.castShadow = true;
            this.grupoEscena.add(pata);
        });

        const radioExterno = r.radioExterno;
        let alturaSoporte;
        if (params.forma === 'u') {
            alturaSoporte = h * 0.6 + radioExterno + 0.05;
        } else if (params.forma === 'toroidal') {
            alturaSoporte = radioExterno * 1.5 + 0.02;
        } else {
            alturaSoporte = radioExterno * 1.35 + 0.02;
        }
        const yCentroBobina = alturaPatas + altoMesa / 2 + alturaSoporte;

        const crearSoporte = (x) => {
            const grupo = new THREE.Group();
            const poste = new THREE.Mesh(
                new THREE.CylinderGeometry(0.008, 0.008, alturaSoporte, 12),
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.3 })
            );
            poste.position.y = alturaSoporte / 2;
            poste.castShadow = true;
            grupo.add(poste);
            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.008, 16),
                new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8 })
            );
            base.position.y = 0.004;
            grupo.add(base);
            const rama1 = new THREE.Mesh(
                new THREE.CylinderGeometry(0.004, 0.004, 0.05, 8),
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 })
            );
            rama1.position.set(0, alturaSoporte + 0.015, 0.018);
            grupo.add(rama1);
            const rama2 = rama1.clone();
            rama2.position.set(0, alturaSoporte + 0.015, -0.018);
            grupo.add(rama2);
            grupo.position.x = x;
            grupo.position.y = alturaPatas + altoMesa / 2;
            this.grupoEscena.add(grupo);
        };
        crearSoporte(-h / 2 - 0.04);
        crearSoporte(h / 2 + 0.04);

        if (params.forma === 'barra') this.dibujarFormaBarra(params, r, yCentroBobina);
        else if (params.forma === 'u') this.dibujarFormaU(params, r, yCentroBobina);
        else if (params.forma === 'toroidal') this.dibujarFormaToroidal(params, r, yCentroBobina);
        else this.dibujarFormaAire(params, r, yCentroBobina);

        const fuenteX = -anchoMesa / 2 + 0.2;
        const fuenteZ = fondoMesa / 2 - 0.15;
        const fuenteY = alturaPatas + altoMesa / 2;
        const fuente = new THREE.Group();
        const caja = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.15, 0.12),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 })
        );
        caja.castShadow = true;
        fuente.add(caja);
        const pantalla = new THREE.Mesh(
            new THREE.PlaneGeometry(0.12, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x001a00 })
        );
        pantalla.position.set(0, 0.03, 0.062);
        fuente.add(pantalla);
        const terminalPos = new THREE.Mesh(
            new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8),
            new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000 })
        );
        terminalPos.position.set(-0.05, -0.06, 0.06);
        terminalPos.rotation.x = Math.PI / 2;
        fuente.add(terminalPos);
        const terminalNeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8),
            new THREE.MeshStandardMaterial({ color: 0x000000 })
        );
        terminalNeg.position.set(0.05, -0.06, 0.06);
        terminalNeg.rotation.x = Math.PI / 2;
        fuente.add(terminalNeg);
        fuente.position.set(fuenteX, fuenteY + 0.08, fuenteZ);
        this.grupoEscena.add(fuente);

        const crearCable = (inicio, fin, color) => {
            const puntos = [];
            for (let i = 0; i <= 20; i++) {
                const t = i / 20;
                const x = inicio.x + (fin.x - inicio.x) * t;
                const y = inicio.y + (fin.y - inicio.y) * t + Math.sin(t * Math.PI) * 0.08;
                const z = inicio.z + (fin.z - inicio.z) * t;
                puntos.push(new THREE.Vector3(x, y, z));
            }
            const curva = new THREE.CatmullRomCurve3(puntos);
            const geo = new THREE.TubeGeometry(curva, 40, 0.005, 8, false);
            return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 }));
        };
        const puntoInicioAlambre = new THREE.Vector3(-h / 2, yCentroBobina + r.tuboRadio + r.radioVisual, 0);
        const puntoFinAlambre = new THREE.Vector3(h / 2, yCentroBobina + r.tuboRadio + r.radioVisual, 0);
        const terminalPosWorld = new THREE.Vector3(fuenteX - 0.05, fuenteY + 0.08 - 0.06, fuenteZ + 0.06);
        const terminalNegWorld = new THREE.Vector3(fuenteX + 0.05, fuenteY + 0.08 - 0.06, fuenteZ + 0.06);
        this.grupoEscena.add(crearCable(terminalPosWorld, puntoInicioAlambre, 0xcc0000));
        this.grupoEscena.add(crearCable(terminalNegWorld, puntoFinAlambre, 0x111111));

        this.offsetAlambre = new THREE.Vector3(0, yCentroBobina, 0);
        this.formaActual = params.forma;
        this.geometriaActual = { h, D, yCentro: yCentroBobina, tuboRadio: r.tuboRadio, radioVisual: r.radioVisual };
    }

    dibujarFormaBarra(params, r, yCentro) {
        const h = params.longitud / 100;
        const D = params.diametro / 100;
        const R = D / 2;
        const nucleoInfo = NUCLEO_DATA[params.nucleo];
        const tuboRadio = r.tuboRadio;
        const radioVisual = r.radioVisual;
        const diametroVisual = radioVisual * 2;
        const vueltasPorCapa = r.vueltasPorCapa;
        const numCapas = r.numCapas;

        if (params.nucleo !== 'aire') {
            const nucleoCil = new THREE.Mesh(
                new THREE.CylinderGeometry(R * 0.65, R * 0.65, h + 0.08, 32),
                new THREE.MeshStandardMaterial({
                    color: nucleoInfo.color,
                    metalness: nucleoInfo.metal,
                    roughness: nucleoInfo.rough
                })
            );
            nucleoCil.rotation.z = Math.PI / 2;
            nucleoCil.position.y = yCentro;
            nucleoCil.castShadow = true;
            this.grupoEscena.add(nucleoCil);
        }
        const tubo = new THREE.Mesh(
            new THREE.CylinderGeometry(tuboRadio, tuboRadio, h + 0.05, 32),
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff, roughness: 0.15, metalness: 0.1,
                transparent: true, opacity: 0.35,
                clearcoat: 1, clearcoatRoughness: 0.1
            })
        );
        tubo.rotation.z = Math.PI / 2;
        tubo.position.y = yCentro;
        this.grupoEscena.add(tubo);

        const temp = r.temperatura || 25;
        const color = this.colorPorTemperatura(temp);
        const matAlambre = new THREE.MeshStandardMaterial({
            color: color, metalness: 0.95, roughness: 0.25,
            emissive: color, emissiveIntensity: temp > 100 ? 0.6 : 0.1
        });

        this.curvasAlambre = [];
        for (let capa = 0; capa < numCapas; capa++) {
            let vueltasEstaCapa;
            if (capa < numCapas - 1) vueltasEstaCapa = vueltasPorCapa;
            else {
                vueltasEstaCapa = params.vueltas - (numCapas - 1) * vueltasPorCapa;
                if (vueltasEstaCapa <= 0) vueltasEstaCapa = vueltasPorCapa;
            }
            const radioCapa = tuboRadio + radioVisual + capa * diametroVisual;
            const vueltasVisuales = Math.min(vueltasEstaCapa, 200);
            const totalPuntos = vueltasVisuales * 24;
            const longitudHelice = Math.min(diametroVisual * vueltasVisuales, h);
            const puntos = [];
            for (let i = 0; i <= totalPuntos; i++) {
                const t = i / totalPuntos;
                const angulo = t * vueltasVisuales * Math.PI * 2 + (capa * Math.PI);
                const x = -longitudHelice / 2 + t * longitudHelice;
                const y = radioCapa * Math.cos(angulo);
                const z = radioCapa * Math.sin(angulo);
                puntos.push(new THREE.Vector3(x, y, z));
            }
            const curva = new THREE.CatmullRomCurve3(puntos);
            const geoAlambre = new THREE.TubeGeometry(curva, totalPuntos, radioVisual, 8, false);
            const alambre = new THREE.Mesh(geoAlambre, matAlambre);
            alambre.position.y = yCentro;
            alambre.castShadow = true;
            this.grupoEscena.add(alambre);
            this.curvasAlambre.push(curva);
        }
        this.curvaAlambre = this.curvasAlambre[0];
    }

    dibujarFormaU(params, r, yCentro) {
        const h = params.longitud / 100;
        const D = params.diametro / 100;
        const R = D / 2;
        const nucleoInfo = NUCLEO_DATA[params.nucleo];
        const radioVisual = r.radioVisual;
        const longitudBrazo = h * 1.2;
        const separacionBrazos = R * 1.8;
        const radioNucleo = R * 0.35;
        this.geometriaU = { separacionBrazos, longitudBrazo, radioNucleo };
        const matNucleo = new THREE.MeshStandardMaterial({
            color: nucleoInfo.color,
            metalness: nucleoInfo.metal,
            roughness: nucleoInfo.rough
        });
        const brazoIzq = new THREE.Mesh(
            new THREE.CylinderGeometry(radioNucleo, radioNucleo, longitudBrazo, 24),
            matNucleo
        );
        brazoIzq.position.set(-separacionBrazos / 2, yCentro, 0);
        brazoIzq.castShadow = true;
        this.grupoEscena.add(brazoIzq);
        const brazoDer = new THREE.Mesh(
            new THREE.CylinderGeometry(radioNucleo, radioNucleo, longitudBrazo, 24),
            matNucleo
        );
        brazoDer.position.set(separacionBrazos / 2, yCentro, 0);
        brazoDer.castShadow = true;
        this.grupoEscena.add(brazoDer);
        const baseU = new THREE.Mesh(
            new THREE.TorusGeometry(separacionBrazos / 2, radioNucleo, 12, 32, Math.PI),
            matNucleo
        );
        baseU.rotation.z = Math.PI;
        baseU.position.set(0, yCentro - longitudBrazo / 2, 0);
        this.grupoEscena.add(baseU);
        const temp = r.temperatura || 25;
        const color = this.colorPorTemperatura(temp);
        const matAlambre = new THREE.MeshStandardMaterial({
            color: color, metalness: 0.95, roughness: 0.25,
            emissive: color, emissiveIntensity: temp > 100 ? 0.6 : 0.1
        });
        this.curvasAlambre = [];
        const vueltasTotales = Math.min(params.vueltas, 400);
        const vueltasPorBrazo = Math.floor(vueltasTotales / 2);
        if (vueltasPorBrazo > 0) {
            const curvaIzq = this.crearHeliceBrazoU(
                -separacionBrazos / 2, yCentro, longitudBrazo,
                radioNucleo, radioVisual, vueltasPorBrazo, 0
            );
            const geoIzq = new THREE.TubeGeometry(curvaIzq, vueltasPorBrazo * 20, radioVisual, 8, false);
            const alambreIzq = new THREE.Mesh(geoIzq, matAlambre);
            alambreIzq.castShadow = true;
            this.grupoEscena.add(alambreIzq);
            this.curvasAlambre.push(curvaIzq);
            const curvaDer = this.crearHeliceBrazoU(
                separacionBrazos / 2, yCentro, longitudBrazo,
                radioNucleo, radioVisual, vueltasPorBrazo, Math.PI
            );
            const geoDer = new THREE.TubeGeometry(curvaDer, vueltasPorBrazo * 20, radioVisual, 8, false);
            const alambreDer = new THREE.Mesh(geoDer, matAlambre);
            alambreDer.castShadow = true;
            this.grupoEscena.add(alambreDer);
            this.curvasAlambre.push(curvaDer);
        }
        this.curvaAlambre = this.curvasAlambre[0];
    }

    crearHeliceBrazoU(xBrazo, yCentro, longitudBrazo, radioNucleo, radioVisual, numVueltas, fase) {
        const longitudBobina = longitudBrazo * 0.9;
        const radioBobina = radioNucleo + radioVisual;
        const yInicio = yCentro - longitudBobina / 2;
        const yFin = yCentro + longitudBobina / 2;
        const puntosPorVuelta = 20;
        const totalPuntos = numVueltas * puntosPorVuelta;
        const puntos = [];
        for (let i = 0; i <= totalPuntos; i++) {
            const t = i / totalPuntos;
            const angulo = t * numVueltas * Math.PI * 2 + fase;
            const y = yInicio + t * (yFin - yInicio);
            const x = xBrazo + radioBobina * Math.cos(angulo);
            const z = radioBobina * Math.sin(angulo);
            puntos.push(new THREE.Vector3(x, y, z));
        }
        return new THREE.CatmullRomCurve3(puntos);
    }

    dibujarFormaToroidal(params, r, yCentro) {
        const h = params.longitud / 100;
        const D = params.diametro / 100;
        const R = D / 2;
        const nucleoInfo = NUCLEO_DATA[params.nucleo];
        const radioVisual = r.radioVisual;
        const tuboRadio = r.tuboRadio;
        const radioMayor = tuboRadio * 1.2;
        const radioMenor = R * 0.45;
        this.geometriaToroidal = { radioMayor, radioMenor };
        const toro = new THREE.Mesh(
            new THREE.TorusGeometry(radioMayor, radioMenor, 24, 48),
            new THREE.MeshStandardMaterial({
                color: nucleoInfo.color,
                metalness: nucleoInfo.metal,
                roughness: nucleoInfo.rough
            })
        );
        toro.rotation.x = Math.PI / 2;
        toro.position.y = yCentro;
        toro.castShadow = true;
        this.grupoEscena.add(toro);
        const temp = r.temperatura || 25;
        const color = this.colorPorTemperatura(temp);
        const matAlambre = new THREE.MeshStandardMaterial({
            color: color, metalness: 0.95, roughness: 0.25,
            emissive: color, emissiveIntensity: temp > 100 ? 0.6 : 0.1
        });
        this.curvasAlambre = [];
        const gruposVueltas = Math.min(params.vueltas, 200);
        const puntos = [];
        const puntosPorVuelta = 24;
        for (let g = 0; g <= gruposVueltas; g++) {
            const anguloGrande = (g / gruposVueltas) * Math.PI * 2;
            const cx = radioMayor * Math.cos(anguloGrande);
            const cz = radioMayor * Math.sin(anguloGrande);
            for (let p = 0; p < puntosPorVuelta; p++) {
                const subAngulo = (p / puntosPorVuelta) * Math.PI * 2;
                const offsetX = Math.cos(anguloGrande) * radioMenor * Math.cos(subAngulo);
                const offsetY = radioMenor * Math.sin(subAngulo);
                const offsetZ = Math.sin(anguloGrande) * radioMenor * Math.cos(subAngulo);
                puntos.push(new THREE.Vector3(cx + offsetX, yCentro + offsetY, cz + offsetZ));
            }
        }
        const curva = new THREE.CatmullRomCurve3(puntos);
        const geoAlambre = new THREE.TubeGeometry(curva, puntos.length, radioVisual * 0.7, 6, false);
        const alambre = new THREE.Mesh(geoAlambre, matAlambre);
        this.grupoEscena.add(alambre);
        this.curvasAlambre.push(curva);
        this.curvaAlambre = curva;
    }

    dibujarFormaAire(params, r, yCentro) {
        const h = params.longitud / 100;
        const radioVisual = r.radioVisual;
        const diametroVisual = radioVisual * 2;
        const tuboRadio = r.tuboRadio;
        const vueltasPorCapa = r.vueltasPorCapa;
        const numCapas = r.numCapas;
        const tubo = new THREE.Mesh(
            new THREE.CylinderGeometry(tuboRadio, tuboRadio, h + 0.05, 32),
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff, roughness: 0.1, metalness: 0.05,
                transparent: true, opacity: 0.25,
                clearcoat: 1, clearcoatRoughness: 0.05
            })
        );
        tubo.rotation.z = Math.PI / 2;
        tubo.position.y = yCentro;
        this.grupoEscena.add(tubo);
        const temp = r.temperatura || 25;
        const color = this.colorPorTemperatura(temp);
        const matAlambre = new THREE.MeshStandardMaterial({
            color: color, metalness: 0.95, roughness: 0.25,
            emissive: color, emissiveIntensity: temp > 100 ? 0.6 : 0.1
        });
        this.curvasAlambre = [];
        for (let capa = 0; capa < numCapas; capa++) {
            let vueltasEstaCapa;
            if (capa < numCapas - 1) vueltasEstaCapa = vueltasPorCapa;
            else {
                vueltasEstaCapa = params.vueltas - (numCapas - 1) * vueltasPorCapa;
                if (vueltasEstaCapa <= 0) vueltasEstaCapa = vueltasPorCapa;
            }
            const radioCapa = tuboRadio + radioVisual + capa * diametroVisual;
            const vueltasVisuales = Math.min(vueltasEstaCapa, 200);
            const totalPuntos = vueltasVisuales * 24;
            const longitudHelice = Math.min(diametroVisual * vueltasVisuales, h);
            const puntos = [];
            for (let i = 0; i <= totalPuntos; i++) {
                const t = i / totalPuntos;
                const angulo = t * vueltasVisuales * Math.PI * 2 + (capa * Math.PI);
                const x = -longitudHelice / 2 + t * longitudHelice;
                const y = radioCapa * Math.cos(angulo);
                const z = radioCapa * Math.sin(angulo);
                puntos.push(new THREE.Vector3(x, y, z));
            }
            const curva = new THREE.CatmullRomCurve3(puntos);
            const geoAlambre = new THREE.TubeGeometry(curva, totalPuntos, radioVisual, 8, false);
            const alambre = new THREE.Mesh(geoAlambre, matAlambre);
            alambre.position.y = yCentro;
            this.grupoEscena.add(alambre);
            this.curvasAlambre.push(curva);
        }
        this.curvaAlambre = this.curvasAlambre[0];
    }

    colorPorTemperatura(T) {
        const t = Math.min(T / 1085, 1);
        const r = Math.min(1, 0.4 + t * 0.6 + (t > 0.5 ? 0.3 : 0));
        const g = Math.max(0, 0.3 - t * 0.3 + (t > 0.7 ? 0.4 : 0));
        const b = Math.max(0, 0.15 - t * 0.15);
        return new THREE.Color(r, g, b);
    }

    dibujarCampo(B, saturado) {
        while (this.grupoCampo.children.length > 0) {
            this.grupoCampo.remove(this.grupoCampo.children[0]);
        }
        while (this.grupoParticulasCampo.children.length > 0) {
            this.grupoParticulasCampo.remove(this.grupoParticulasCampo.children[0]);
        }
        this.lineasCampo = [];
        this.particulasCampo = [];
        if (B < 0.001) return;
        const forma = this.formaActual || 'barra';
        if (forma === 'barra') this.campoBarra(B, saturado);
        else if (forma === 'u') this.campoU(B, saturado);
        else if (forma === 'toroidal') this.campoToroidal(B, saturado);
        else this.campoAire(B, saturado);
    }

    campoBarra(B, saturado) {
        const Bmax = 2.5;
        const intensidad = Math.min(Math.pow(B / Bmax, 0.5), 1);
        const colorBase = saturado ? 0xff4444 : 0x66ccff;
        const centro = new THREE.Vector3(0, this.offsetAlambre.y, 0);
        const h = this.geometriaActual.h;
        const numLineas = Math.floor(6 + intensidad * 14);
        const alcance = 0.05 + intensidad * 0.22;
        this.parametrosCampo = { numLineas, alcance, h, centro, intensidad, tipo: 'barra' };
        for (let k = 0; k < numLineas; k++) {
            const anguloPlano = (k / numLineas) * Math.PI * 2;
            const puntos = [];
            for (let j = 0; j <= 80; j++) {
                const t = j / 80;
                const phi = t * Math.PI * 2;
                const seno = Math.sin(phi / 2);
                const radLazo = alcance * (0.3 + 0.7 * Math.pow(Math.abs(seno), 0.7));
                const xNorm = Math.cos(phi);
                const rNorm = Math.sin(phi);
                const x = xNorm * (h / 2 + 0.04);
                const r = rNorm * radLazo;
                const y = centro.y + r * Math.cos(anguloPlano);
                const z = r * Math.sin(anguloPlano);
                puntos.push(new THREE.Vector3(x, y, z));
            }
            const curva = new THREE.CatmullRomCurve3(puntos);
            const geo = new THREE.TubeGeometry(curva, 120, 0.0012 + intensidad * 0.0016, 8, false);
            this.grupoCampo.add(new THREE.Mesh(geo,
                new THREE.MeshBasicMaterial({ color: colorBase, transparent: true, opacity: 0.35 + intensidad * 0.55 })
            ));
        }
        this.crearParticulasCampo(numLineas, intensidad, saturado, 'barra');
    }

    campoU(B, saturado) {
        const Bmax = 2.5;
        const intensidad = Math.min(Math.pow(B / Bmax, 0.5), 1);
        const colorBase = saturado ? 0xff4444 : 0x66ccff;
        const centro = new THREE.Vector3(0, this.offsetAlambre.y, 0);
        const geo = this.geometriaU;
        const sepBrazos = geo.separacionBrazos;
        const longBrazo = geo.longitudBrazo;
        const numLineas = Math.floor(8 + intensidad * 12);
        const alcance = 0.03 + intensidad * 0.08;
        const alturaCampo = longBrazo * 0.42;
        this.parametrosCampo = { numLineas, alcance, h: sepBrazos, centro, intensidad, tipo: 'u', sepBrazos, longBrazo, alturaCampo };
        for (let k = 0; k < numLineas; k++) {
            const angulo = (k / numLineas) * Math.PI * 2;
            const rr = (0.3 + 0.7 * Math.random()) * alcance;
            const puntos = [];
            for (let j = 0; j <= 30; j++) {
                const t = j / 30;
                const x = -sepBrazos / 2 + t * sepBrazos;
                const alturaCurva = Math.sin(t * Math.PI) * rr;
                const offsetY = Math.cos(angulo) * alturaCurva;
                const offsetZ = Math.sin(angulo) * alturaCurva;
                const y = centro.y + alturaCampo + offsetY;
                const z = offsetZ;
                puntos.push(new THREE.Vector3(x, y, z));
            }
            const curva = new THREE.CatmullRomCurve3(puntos);
            const geoLinea = new THREE.TubeGeometry(curva, 40, 0.0012 + intensidad * 0.0016, 8, false);
            this.grupoCampo.add(new THREE.Mesh(geoLinea,
                new THREE.MeshBasicMaterial({ color: colorBase, transparent: true, opacity: 0.5 + intensidad * 0.5 })
            ));
        }
        this.crearParticulasCampoU(numLineas, intensidad, saturado);
    }

    campoToroidal(B, saturado) {
        const Bmax = 2.5;
        const intensidad = Math.min(Math.pow(B / Bmax, 0.5), 1);
        const colorBase = saturado ? 0xff4444 : 0x66ccff;
        const centro = new THREE.Vector3(0, this.offsetAlambre.y, 0);
        const geo = this.geometriaToroidal;
        const radioMayor = geo.radioMayor;
        const radioMenor = geo.radioMenor;
        const numLineas = Math.floor(8 + intensidad * 12);
        const alcance = radioMenor;
        this.parametrosCampo = { numLineas, alcance, h: radioMayor, centro, intensidad, tipo: 'toroidal', radioMayor, radioMenor };
        for (let k = 0; k < numLineas; k++) {
            const frac = k / numLineas;
            const rLinea = radioMayor * (0.5 + frac * 0.45);
            const puntos = [];
            const numPuntos = 80;
            for (let j = 0; j <= numPuntos; j++) {
                const t = j / numPuntos;
                const angulo = t * Math.PI * 2;
                const x = rLinea * Math.cos(angulo);
                const z = rLinea * Math.sin(angulo);
                const y = centro.y;
                puntos.push(new THREE.Vector3(x, y, z));
            }
            const curva = new THREE.CatmullRomCurve3(puntos);
            const geoLinea = new THREE.TubeGeometry(curva, 120, 0.0012 + intensidad * 0.0015, 6, false);
            this.grupoCampo.add(new THREE.Mesh(geoLinea,
                new THREE.MeshBasicMaterial({ color: colorBase, transparent: true, opacity: 0.6 + intensidad * 0.4 })
            ));
        }
        this.crearParticulasCampoToroidal(numLineas, intensidad, saturado);
    }

    campoAire(B, saturado) {
        const Bmax = 2.5;
        const intensidad = Math.min(Math.pow(B / Bmax, 0.4), 1);
        const colorBase = saturado ? 0xff4444 : 0x88ddff;
        const centro = new THREE.Vector3(0, this.offsetAlambre.y, 0);
        const h = this.geometriaActual ? this.geometriaActual.h : 0.1;
        const numLineas = Math.floor(3 + intensidad * 6);
        const alcance = 0.03 + intensidad * 0.1;
        this.parametrosCampo = { numLineas, alcance, h, centro, intensidad, tipo: 'aire' };
        for (let k = 0; k < numLineas; k++) {
            const angulo = (k / numLineas) * Math.PI * 2;
            const puntos = [];
            for (let j = 0; j <= 40; j++) {
                const t = j / 40;
                const phi = t * Math.PI;
                const rad = alcance * Math.sin(phi);
                const x = (t - 0.5) * h * 1.5;
                const y = centro.y + rad * Math.cos(angulo);
                const z = rad * Math.sin(angulo);
                puntos.push(new THREE.Vector3(x, y, z));
            }
            const curva = new THREE.CatmullRomCurve3(puntos);
            const geo = new THREE.TubeGeometry(curva, 60, 0.0008 + intensidad * 0.0008, 6, false);
            this.grupoCampo.add(new THREE.Mesh(geo,
                new THREE.MeshBasicMaterial({ color: colorBase, transparent: true, opacity: 0.2 + intensidad * 0.3 })
            ));
        }
        this.crearParticulasCampo(numLineas, intensidad, saturado, 'aire');
    }

    crearParticulasCampo(numLineas, intensidad, saturado, tipo) {
        if (intensidad < 0.05) return;
        const numPart = Math.floor(15 + intensidad * 80);
        const geoPart = new THREE.SphereGeometry(0.002 + intensidad * 0.002, 6, 6);
        const centro = new THREE.Vector3(0, this.offsetAlambre.y, 0);
        for (let i = 0; i < numPart; i++) {
            const matPart = new THREE.MeshBasicMaterial({
                color: saturado ? 0xffaaaa : 0xaaddff,
                transparent: true, opacity: 0.85
            });
            const p = new THREE.Mesh(geoPart, matPart);
            p.userData.lineaIdx = Math.floor(Math.random() * numLineas);
            p.userData.t = Math.random();
            p.userData.velocidad = 0.1 + intensidad * 0.2 + Math.random() * 0.05;
            p.userData.tipo = tipo;
            p.userData.centro = centro;
            this.grupoParticulasCampo.add(p);
            this.particulasCampo.push(p);
        }
    }

    crearParticulasCampoU(numLineas, intensidad, saturado) {
        if (intensidad < 0.05) return;
        const numPart = Math.floor(20 + intensidad * 60);
        const geoPart = new THREE.SphereGeometry(0.002 + intensidad * 0.002, 6, 6);
        const centro = new THREE.Vector3(0, this.offsetAlambre.y, 0);
        const geo = this.geometriaU;
        const alturaCampo = geo.longitudBrazo * 0.42;
        for (let i = 0; i < numPart; i++) {
            const matPart = new THREE.MeshBasicMaterial({
                color: saturado ? 0xffaaaa : 0xaaddff,
                transparent: true, opacity: 0.85
            });
            const p = new THREE.Mesh(geoPart, matPart);
            p.userData.lineaIdx = Math.floor(Math.random() * numLineas);
            p.userData.t = Math.random();
            p.userData.velocidad = 0.15 + intensidad * 0.25 + Math.random() * 0.1;
            p.userData.tipo = 'u';
            p.userData.centro = centro;
            p.userData.geo = geo;
            p.userData.alturaCampo = alturaCampo;
            this.grupoParticulasCampo.add(p);
            this.particulasCampo.push(p);
        }
    }

    crearParticulasCampoToroidal(numLineas, intensidad, saturado) {
        if (intensidad < 0.05) return;
        const numPart = Math.floor(20 + intensidad * 60);
        const geoPart = new THREE.SphereGeometry(0.002 + intensidad * 0.002, 6, 6);
        const centro = new THREE.Vector3(0, this.offsetAlambre.y, 0);
        const geo = this.geometriaToroidal;
        for (let i = 0; i < numPart; i++) {
            const matPart = new THREE.MeshBasicMaterial({
                color: saturado ? 0xffaaaa : 0xaaddff,
                transparent: true, opacity: 0.85
            });
            const p = new THREE.Mesh(geoPart, matPart);
            p.userData.lineaIdx = Math.floor(Math.random() * numLineas);
            p.userData.t = Math.random();
            p.userData.velocidad = 0.15 + intensidad * 0.25 + Math.random() * 0.1;
            p.userData.tipo = 'toroidal';
            p.userData.centro = centro;
            p.userData.geo = geo;
            this.grupoParticulasCampo.add(p);
            this.particulasCampo.push(p);
        }
    }

    calcularPosicionParticula(p) {
        const t = p.userData.t;
        const lineaIdx = p.userData.lineaIdx;
        const centro = p.userData.centro;
        const tipo = p.userData.tipo;
        const params = this.parametrosCampo || {};
        if (tipo === 'barra') {
            const numLineas = params.numLineas || 8;
            const alcance = params.alcance || 0.1;
            const h = params.h || 0.1;
            const phi = t * Math.PI * 2;
            const seno = Math.sin(phi / 2);
            const radLazo = alcance * (0.3 + 0.7 * Math.pow(Math.abs(seno), 0.7));
            const anguloPlano = (lineaIdx / numLineas) * Math.PI * 2;
            const xNorm = Math.cos(phi);
            const rNorm = Math.sin(phi);
            const x = xNorm * (h / 2 + 0.04);
            const r = rNorm * radLazo;
            const y = centro.y + r * Math.cos(anguloPlano);
            const z = r * Math.sin(anguloPlano);
            return new THREE.Vector3(x, y, z);
        } else if (tipo === 'u') {
            const geo = p.userData.geo;
            const numLineas = params.numLineas || 8;
            const alcance = params.alcance || 0.05;
            const alturaCampo = p.userData.alturaCampo || 0;
            const angulo = (lineaIdx / numLineas) * Math.PI * 2;
            const rr = (0.3 + 0.7 * (lineaIdx / numLineas)) * alcance;
            const x = -geo.separacionBrazos / 2 + t * geo.separacionBrazos;
            const alturaCurva = Math.sin(t * Math.PI) * rr;
            const offsetY = Math.cos(angulo) * alturaCurva;
            const offsetZ = Math.sin(angulo) * alturaCurva;
            const y = centro.y + alturaCampo + offsetY;
            const z = offsetZ;
            return new THREE.Vector3(x, y, z);
        } else if (tipo === 'toroidal') {
            const geo = p.userData.geo;
            const angulo = t * Math.PI * 2;
            const x = geo.radioMayor * Math.cos(angulo);
            const z = geo.radioMayor * Math.sin(angulo);
            const y = centro.y;
            return new THREE.Vector3(x, y, z);
        } else {
            const numLineas = params.numLineas || 6;
            const alcance = params.alcance || 0.1;
            const h = params.h || 0.1;
            const angulo = (lineaIdx / numLineas) * Math.PI * 2;
            const rad = alcance * Math.sin(t * Math.PI);
            const x = (t - 0.5) * h * 1.5;
            const y = centro.y + rad * Math.cos(angulo);
            const z = rad * Math.sin(angulo);
            return new THREE.Vector3(x, y, z);
        }
    }

    dibujarElectrones(I) {
        while (this.grupoElectrones.children.length > 0) {
            this.grupoElectrones.remove(this.grupoElectrones.children[0]);
        }
        this.electrones = [];
        if (I < 0.1 || !this.curvasAlambre || this.curvasAlambre.length === 0) return;
        const forma = this.formaActual || 'barra';
        let radioElectron = (forma === 'u' || forma === 'toroidal') ? 0.0018 : 0.003;
        let numElectrones = (forma === 'u' || forma === 'toroidal')
            ? Math.min(Math.floor(I * 3) + 10, 50)
            : Math.min(Math.floor(I * 2) + 5, 30);
        const geo = new THREE.SphereGeometry(radioElectron, 8, 8);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 1.0,
            depthTest: false
        });
        this.formaElectrones = forma;
        for (let i = 0; i < numElectrones; i++) {
            const e = new THREE.Mesh(geo, mat);
            e.userData.capa = i % this.curvasAlambre.length;
            e.userData.t = i / numElectrones;
            e.userData.velocidad = 0.08 + I * 0.012;
            e.renderOrder = 999;
            this.grupoElectrones.add(e);
            this.electrones.push(e);
        }
    }

    explotarBobina(posicion) {
        const flash = document.getElementById('flash-explosion');
        if (flash) {
            flash.classList.add('activo');
            setTimeout(() => flash.classList.remove('activo'), 200);
        }
        const luzExplosion = new THREE.PointLight(0xffaa00, 20, 5, 2);
        luzExplosion.position.copy(posicion);
        this.scene.add(luzExplosion);
        setTimeout(() => this.scene.remove(luzExplosion), 300);

        const colores = [0xff2200, 0xff6600, 0xffcc00, 0xffffff, 0xff4400];
        for (let i = 0; i < 80; i++) {
            const tam = 0.005 + Math.random() * 0.015;
            const geo = Math.random() > 0.5
                ? new THREE.BoxGeometry(tam, tam, tam)
                : new THREE.SphereGeometry(tam, 6, 6);
            const color = colores[Math.floor(Math.random() * colores.length)];
            const mat = new THREE.MeshBasicMaterial({ color });
            const frag = new THREE.Mesh(geo, mat);
            frag.position.copy(posicion);
            frag.position.x += (Math.random() - 0.5) * 0.05;
            frag.position.y += (Math.random() - 0.5) * 0.05;
            frag.position.z += (Math.random() - 0.5) * 0.05;
            frag.userData.vel = new THREE.Vector3(
                (Math.random() - 0.5) * 0.9,
                Math.random() * 1.2 + 0.3,
                (Math.random() - 0.5) * 0.9
            );
            frag.userData.vida = 1.5 + Math.random() * 1.0;
            frag.userData.tiempo = 0;
            frag.userData.rotVel = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            this.grupoExplosion.add(frag);
            this.particulasExplosion.push(frag);
        }
        for (let i = 0; i < 150; i++) {
            const geo = new THREE.SphereGeometry(0.0015 + Math.random() * 0.002, 4, 4);
            const color = colores[Math.floor(Math.random() * colores.length)];
            const mat = new THREE.MeshBasicMaterial({ color });
            const chispa = new THREE.Mesh(geo, mat);
            chispa.position.copy(posicion);
            chispa.userData.vel = new THREE.Vector3(
                (Math.random() - 0.5) * 2.5,
                Math.random() * 2.5 + 0.5,
                (Math.random() - 0.5) * 2.5
            );
            chispa.userData.vida = 0.8 + Math.random() * 0.6;
            chispa.userData.tiempo = 0;
            this.grupoExplosion.add(chispa);
            this.particulasExplosion.push(chispa);
        }
        for (let i = 0; i < 15; i++) {
            const tam = 0.02 + Math.random() * 0.04;
            const geo = new THREE.SphereGeometry(tam, 8, 8);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x333333, transparent: true, opacity: 0.6
            });
            const humo = new THREE.Mesh(geo, mat);
            humo.position.copy(posicion);
            humo.position.x += (Math.random() - 0.5) * 0.1;
            humo.position.y += Math.random() * 0.08;
            humo.position.z += (Math.random() - 0.5) * 0.1;
            humo.userData.vel = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                0.15 + Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            humo.userData.vida = 2.5;
            humo.userData.tiempo = 0;
            humo.userData.esHumo = true;
            this.grupoExplosion.add(humo);
            this.particulasExplosion.push(humo);
        }
        this.grupoEscena.visible = false;
        this.grupoCampo.visible = false;
        this.grupoElectrones.visible = false;
        this.grupoParticulasCampo.visible = false;
    }

    actualizar(dt) {
        this.tiempo += dt;

        this.electrones.forEach(e => {
            if (e.userData.vel !== undefined) return;
            e.userData.t = (e.userData.t + e.userData.velocidad * dt) % 1;
            const capa = e.userData.capa || 0;
            const curva = this.curvasAlambre && this.curvasAlambre[capa];
            if (curva) {
                const pos = curva.getPoint(e.userData.t);
                const forma = this.formaElectrones || 'barra';
                if (forma === 'barra' || forma === 'aire') {
                    if (this.offsetAlambre) pos.add(this.offsetAlambre);
                }
                e.position.copy(pos);
            }
        });

        if (this.parametrosCampo) {
            this.particulasCampo.forEach(p => {
                p.userData.t = (p.userData.t + p.userData.velocidad * dt) % 1;
                const pos = this.calcularPosicionParticula(p);
                p.position.copy(pos);
            });
        }

        for (let i = this.particulasExplosion.length - 1; i >= 0; i--) {
            const p = this.particulasExplosion[i];
            p.userData.tiempo += dt;
            if (p.userData.tiempo >= p.userData.vida) {
                this.grupoExplosion.remove(p);
                this.particulasExplosion.splice(i, 1);
                continue;
            }
            if (p.userData.vel) {
                p.position.x += p.userData.vel.x * dt;
                p.position.y += p.userData.vel.y * dt;
                p.position.z += p.userData.vel.z * dt;
                p.userData.vel.y -= 1.5 * dt;
                p.userData.vel.multiplyScalar(0.98);
            }
            if (p.userData.rotVel) {
                p.rotation.x += p.userData.rotVel.x * dt;
                p.rotation.y += p.userData.rotVel.y * dt;
                p.rotation.z += p.userData.rotVel.z * dt;
            }
            const alpha = 1 - p.userData.tiempo / p.userData.vida;
            if (p.userData.esHumo) {
                p.material.opacity = alpha * 0.6;
                p.scale.multiplyScalar(1.02);
            } else {
                p.material.opacity = alpha;
            }
        }

        this.lineasCampo.forEach((l, i) => {
            l.material.opacity = 0.35 + 0.2 * Math.sin(this.tiempo * 2 + i);
        });

        this.dibujarPantallaValores();
    }

    mostrar() {
        this.grupoLaboratorio.visible = true;
        this.grupoEscena.visible = true;
        this.grupoCampo.visible = true;
        this.grupoElectrones.visible = true;
        this.grupoParticulasCampo.visible = true;
        this.grupoExplosion.visible = true;
        this.grupoPantallaValores.visible = true;
        this.grupoPanelA.visible = true;
        this.grupoPanelB.visible = true;
        this.grupoPanelC.visible = true;

        this.luzAmbiente.intensity = 0.6;
        this.luzTecho.intensity = 1.5;
        this.scene.background = new THREE.Color(0x0a0a1a);
        this.scene.fog = new THREE.Fog(0x0a0a1a, 6, 15);
    }

    ocultar() {
        this.grupoLaboratorio.visible = false;
        this.grupoEscena.visible = false;
        this.grupoCampo.visible = false;
        this.grupoElectrones.visible = false;
        this.grupoParticulasCampo.visible = false;
        this.grupoExplosion.visible = false;
        this.grupoPantallaValores.visible = false;
        this.grupoPanelA.visible = false;
        this.grupoPanelB.visible = false;
        this.grupoPanelC.visible = false;
    }
}