// ============================================
// GRÚA TIPO DESHUESADERO - VERSIÓN JUGUETE
// ============================================

class GruaElectromagnetica {
    constructor(escena) {
        this.escena = escena;
        this.equipada = false;
        this.pesoAdherido = null;
        this.pesos = [];

        this.control = 0;
        this.rotacion = 0;
        this.extension = 1.0;

        this.electroimanY = 1.5;
        this.electroimanYMax = 2.0;
        this.electroimanYMin = 0.3;   // ✅ antes 0.15

        // ✅ FIX: grúa a la izquierda y al frente del usuario VR
        this.posBase = new THREE.Vector3(-1.5, 0, -2.5);
    }

    equipar(bobinaParams, resultado) {
        this.equipada = true;
        this.bobinaParams = bobinaParams;
        this.resultado = resultado;

        const grupo = this.escena.grupoGrua;
        while (grupo.children.length > 0) grupo.remove(grupo.children[0]);

        this.pesos = [];
        this.pesoAdherido = null;
        this.control = 0;
        this.rotacion = 0;
        this.extension = 1.0;
        this.electroimanY = 1.5;

        grupo.position.copy(this.posBase);
        grupo.rotation.y = -Math.PI / 4;   // ✅ gira el brazo hacia el centro de la escena
        // ==========================================
        // BASE GRANDE Y PESADA
        // ==========================================
        const baseGrande = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.15, 0.9),
            new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.7, roughness: 0.5 })
        );
        baseGrande.position.y = 0.075;
        baseGrande.castShadow = true;
        grupo.add(baseGrande);

        const baseSuperior = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.1, 0.7),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.4 })
        );
        baseSuperior.position.y = 0.2;
        baseSuperior.castShadow = true;
        grupo.add(baseSuperior);

        for (let i = -1; i <= 1; i++) {
            const franja = new THREE.Mesh(
                new THREE.BoxGeometry(0.52, 0.02, 0.08),
                new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.6, roughness: 0.4 })
            );
            franja.position.set(0, 0.21, i * 0.2);
            grupo.add(franja);
        }

        // ==========================================
        // MÁSTIL VERTICAL
        // ==========================================
        const mastil = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 1.8, 0.12),
            new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.7, roughness: 0.3 })
        );
        mastil.position.y = 1.15;
        mastil.castShadow = true;
        grupo.add(mastil);

        for (let i = 0; i < 5; i++) {
            const circulo = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.14, 12),
                new THREE.MeshStandardMaterial({ color: 0x222222 })
            );
            circulo.rotation.z = Math.PI / 2;
            circulo.position.set(0, 0.5 + i * 0.3, 0);
            grupo.add(circulo);
        }

        // ==========================================
        // BRAZO HORIZONTAL
        // ==========================================
        this.brazoGrupo = new THREE.Group();
        this.brazoGrupo.position.y = 2.0;
        grupo.add(this.brazoGrupo);

        const brazoHorizontal = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.12, 0.12),
            new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.7, roughness: 0.3 })
        );
        brazoHorizontal.position.set(1.25, 0, 0);
        brazoHorizontal.castShadow = true;
        this.brazoGrupo.add(brazoHorizontal);

        const refuerzoDiag = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.06, 0.06),
            new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.7, roughness: 0.3 })
        );
        refuerzoDiag.position.set(0.35, -0.3, 0);
        refuerzoDiag.rotation.z = Math.PI / 4;
        this.brazoGrupo.add(refuerzoDiag);

        const contrapeso = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.35, 0.35),
            new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.4 })
        );
        contrapeso.position.set(-0.3, 0, 0);
        contrapeso.castShadow = true;
        this.brazoGrupo.add(contrapeso);

        const tope = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.2, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 })
        );
        tope.position.set(2.5, 0, 0);
        this.brazoGrupo.add(tope);

        // ==========================================
        // CABLE Y ELECTROIMÁN
        // ==========================================
        this.cable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.008, 0.008, 0.3, 8),
            new THREE.MeshStandardMaterial({ color: 0x111111 })
        );
        this.brazoGrupo.add(this.cable);

        this.electroiman = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 0.9, roughness: 0.3 })
        );
        this.brazoGrupo.add(this.electroiman);

        const bordeElectro = new THREE.Mesh(
            new THREE.CylinderGeometry(0.19, 0.19, 0.03, 32),
            new THREE.MeshStandardMaterial({ color: 0xff8a00, metalness: 0.7, roughness: 0.4, emissive: 0x331100 })
        );
        this.brazoGrupo.add(bordeElectro);

        const bobinita = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.08, 20),
            new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.3 })
        );
        bobinita.position.y = 0.05;
        this.electroiman.add(bobinita);

        this.crearPesos();
        this.actualizarPosiciones();
    }

    crearPesos() {
        const pesos = [1, 5, 10, 25, 50, 100];
        const grupo = this.escena.grupoGrua;
        const radioDistribucion = 1.5;

        pesos.forEach((gramos, i) => {
            const kg = gramos / 1000;
            const tamaño = 0.08 + Math.sqrt(gramos) * 0.02;

            const geo = new THREE.BoxGeometry(tamaño, tamaño, tamaño);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(i / pesos.length * 0.7, 0.7, 0.5),
                metalness: 0.4,
                roughness: 0.6
            });
            const peso = new THREE.Mesh(geo, mat);

            const angulo = (i / pesos.length) * Math.PI * 2 + Math.PI / 6;
            const x = Math.cos(angulo) * radioDistribucion;
            const z = Math.sin(angulo) * radioDistribucion - 0.5;
            peso.position.set(x, tamaño / 2, z);
            peso.userData.gramos = gramos;
            peso.userData.kg = kg;
            peso.userData.tamaño = tamaño;
            peso.userData.posBase = new THREE.Vector3(x, tamaño / 2, z);
            peso.castShadow = true;

            grupo.add(peso);
            this.pesos.push(peso);

            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, 128, 64);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(2, 2, 124, 60);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${gramos} g`, 64, 32);

            const textura = new THREE.CanvasTexture(canvas);
            const sprite = new THREE.Sprite(
                new THREE.SpriteMaterial({ map: textura, depthTest: false })
            );
            sprite.scale.set(0.45, 0.22, 1);
            sprite.position.set(x, tamaño + 0.2, z);
            grupo.add(sprite);
            peso.userData.etiqueta = sprite;
        });
    }

    actualizarPosiciones() {
        if (!this.brazoGrupo) return;
        this.brazoGrupo.rotation.y = this.rotacion * Math.PI / 180;
        const xElectro = this.extension;
        const alturaLocalElectro = this.electroimanY - 2.0;
        if (this.electroiman) this.electroiman.position.set(xElectro, alturaLocalElectro, 0);
        if (this.cable && this.electroiman) {
            const alturaCableLocal = -alturaLocalElectro;
            this.cable.scale.y = Math.max(0.01, alturaCableLocal / 0.3);
            this.cable.position.set(xElectro, alturaLocalElectro / 2, 0);
        }
    }

    getPosicionElectroiman() {
        if (!this.electroiman) return new THREE.Vector3();
        const pos = new THREE.Vector3();
        this.electroiman.getWorldPosition(pos);
        return pos;
    }

    // ✅ FIX: intentarLevantar con coordenadas del grupo GRÚA correctamente
    intentarLevantar() {
        if (this.pesoAdherido) return false;
        if (!this.resultado) return false;
        const fuerzaActual = this.resultado.F_real;
        if (fuerzaActual <= 0) return false;

        // Convertir posición del electroimán a coordenadas LOCALES del grupo grúa
        const posElectroGrua = new THREE.Vector3();
        this.electroiman.getWorldPosition(posElectroGrua);
        this.escena.grupoGrua.worldToLocal(posElectroGrua);

        // Altura mínima para poder levantar
        if (posElectroGrua.y > 0.8) return false;

        let masCercano = null;
        let distMin = Infinity;
        this.pesos.forEach(p => {
            if (p.userData.adherido) return;
            const dx = p.position.x - posElectroGrua.x;
            const dz = p.position.z - posElectroGrua.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < distMin) {
                distMin = dist;
                masCercano = p;
            }
        });

        // ✅ Radio más generoso
        if (masCercano && distMin < 0.6) {
            const pesoRequerido = masCercano.userData.kg * G;
            if (fuerzaActual >= pesoRequerido) {
                this.pesoAdherido = masCercano;
                masCercano.userData.adherido = true;
                console.log(`🧲 Adherido: ${masCercano.userData.gramos}g`);
                return true;
            }
        }
        return false;
    }

    soltarPeso() {
        if (this.pesoAdherido) {
            const peso = this.pesoAdherido;
            peso.userData.adherido = false;
            const tamaño = peso.userData.tamaño;
            peso.position.set(peso.userData.posBase.x, tamaño / 2, peso.userData.posBase.z);
            peso.userData.etiqueta.position.set(
                peso.userData.posBase.x,
                tamaño + 0.2,
                peso.userData.posBase.z
            );
            this.pesoAdherido = null;
        }
    }

    actualizar(deltaControl, deltaTime) {
        this.electroimanY += deltaControl * 1.0 * deltaTime;
        if (this.electroimanY > this.electroimanYMax) this.electroimanY = this.electroimanYMax;
        if (this.electroimanY < this.electroimanYMin) this.electroimanY = this.electroimanYMin;
        this.actualizarPosiciones();

        if (this.resultado && this.resultado.F_real > 0) {
            this.intentarLevantar();
        } else if (this.pesoAdherido) {
            this.soltarPeso();
        }

        // ✅ FIX: actualizar posición del peso adherido en coords del grupo grúa
        if (this.pesoAdherido && this.electroiman) {
            const posElectroGrua = new THREE.Vector3();
            this.electroiman.getWorldPosition(posElectroGrua);
            this.escena.grupoGrua.worldToLocal(posElectroGrua);

            const alturaPeso = posElectroGrua.y - 0.1 - this.pesoAdherido.userData.tamaño / 2;
            const alturaFinal = Math.max(0.05, alturaPeso);
            this.pesoAdherido.position.set(posElectroGrua.x, alturaFinal, posElectroGrua.z);
            this.pesoAdherido.userData.etiqueta.position.set(
                posElectroGrua.x,
                alturaFinal + this.pesoAdherido.userData.tamaño / 2 + 0.2,
                posElectroGrua.z
            );
        }
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
                    ["Corriente de prueba (I)", `${params.corriente} A`]
                ]),
                new Paragraph({ text: "2. MODELO IDEAL (TEÓRICO)", heading: HeadingLevel.HEADING_2 }),
                new Paragraph("B_ideal = μ₀ · μr · N · I / h"),
                new Paragraph(`B_ideal (sin saturar) = ${r.B_ideal_raw.toFixed(4)} T`),
                new Paragraph(`B_ideal (con saturación) = ${r.B_ideal.toFixed(4)} T`),
                new Paragraph(`¿Saturado? ${r.saturado ? 'SÍ' : 'NO'}`),
                new Paragraph(`F_ideal = ${r.F_ideal.toFixed(2)} N`),
                new Paragraph(`m_max_ideal = ${r.m_max_ideal.toFixed(2)} kg`),
                new Paragraph({ text: "3. MODELO REALISTA (APLICADO)", heading: HeadingLevel.HEADING_2 }),
                new Paragraph("B_real = k · μ₀ · N · I / √(L² + D²)"),
                new Paragraph(`Forma: ${r.formaInfo.nombre}`),
                new Paragraph(`k_base = ${r.formaInfo.k_base.toFixed(3)}`),
                new Paragraph(`Factor ajuste h/D = ${ajustePorRelacion(r.h, r.D).toFixed(3)}`),
                new Paragraph(`k total = ${r.k.toFixed(4)}`),
                new Paragraph(`B_real = ${r.B_real.toExponential(4)} T`),
                new Paragraph(`F_real = ${r.F_real.toExponential(4)} N`),
                new Paragraph(`m_max_real = ${(r.m_max_real * 1000).toFixed(4)} g`),
                new Paragraph({ text: "4. COMPARACIÓN", heading: HeadingLevel.HEADING_2 }),
                crearTablaDocx([
                    ["Magnitud", "Ideal", "Realista"],
                    ["Campo B (T)", r.B_ideal.toExponential(3), r.B_real.toExponential(3)],
                    ["Fuerza F (N)", r.F_ideal.toExponential(3), r.F_real.toExponential(3)],
                    ["Peso máx", r.m_max_ideal.toExponential(3) + " kg", (r.m_max_real * 1000).toExponential(3) + " g"]
                ]),
                new Paragraph({ text: "5. NOTA ACLARATORIA", heading: HeadingLevel.HEADING_2 }),
                new Paragraph("El modelo ideal (solenoide infinito) es una simplificación didáctica. En la realidad existen pérdidas por: retorno del campo por el aire, polos en los extremos, dispersión del flujo y geometría del núcleo. Por eso el modelo realista usa un factor k."),
                new Paragraph({ text: "6. CONCLUSIÓN", heading: HeadingLevel.HEADING_2 }),
                new Paragraph(
                    r.sobrecorriente
                        ? "⚠️ El diseño NO es viable: la corriente excede el límite del alambre."
                        : (r.m_max_real >= 0.001
                            ? `✓ Viable. Puede levantar hasta ${(r.m_max_real * 1000).toFixed(2)} gramos.`
                            : `⚠️ Fuerza real muy baja (${(r.m_max_real * 1000000).toFixed(2)} mg).`)
                ),
                new Paragraph({ text: "7. ECUACIONES", heading: HeadingLevel.HEADING_2 }),
                new Paragraph("• B_ideal = μ₀ · μr · N · I / h"),
                new Paragraph("• B_real = k · μ₀ · N · I / √(L² + D²)"),
                new Paragraph("• F = B² · S / (2 · μ₀)"),
                new Paragraph("• R = ρ · l / A"),
                new Paragraph("• V = I · R"),
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
<tr><td>Corriente</td><td>${params.corriente} A</td></tr>
</table>
<h2>2. Modelo ideal</h2>
<p>B_ideal = ${r.B_ideal.toFixed(4)} T<br>
F_ideal = ${r.F_ideal.toFixed(2)} N<br>
m_max_ideal = ${r.m_max_ideal.toFixed(2)} kg</p>
<h2>3. Modelo realista</h2>
<p>k = ${r.k.toFixed(4)}<br>
B_real = ${r.B_real.toExponential(4)} T<br>
F_real = ${r.F_real.toExponential(4)} N<br>
m_max_real = ${(r.m_max_real * 1000).toFixed(4)} g</p>
<h2>4. Conclusión</h2>
<p>${r.m_max_real >= 0.001 ? 'Viable, puede levantar ' + (r.m_max_real * 1000).toFixed(2) + ' g' : 'Fuerza real muy baja'}</p>
</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_bobina_${Date.now()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
}