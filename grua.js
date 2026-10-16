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
        this.electroimanYMin = 0.3;

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
        grupo.rotation.y = -Math.PI / 4;

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

    intentarLevantar() {
        if (this.pesoAdherido) return false;
        if (!this.resultado) return false;
        const fuerzaActual = this.resultado.F_real;
        if (fuerzaActual <= 0) return false;

        const posElectroGrua = new THREE.Vector3();
        this.electroiman.getWorldPosition(posElectroGrua);
        this.escena.grupoGrua.worldToLocal(posElectroGrua);

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

        if (masCercano && distMin < 0.6) {
            const pesoRequerido = masCercano.userData.kg * G;
            if (fuerzaActual >= pesoRequerido) {
                this.pesoAdherido = masCercano;
                masCercano.userData.adherido = true;
                console.log(`🧲 Adherido: ${masCercano.userData.gramos}g (necesita ${pesoRequerido.toFixed(2)} N, tiene ${fuerzaActual.toFixed(2)} N)`);
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