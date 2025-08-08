export class Rosacruz {
    constructor() {
        this.storageKey = 'rosacruz_egregores';
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffers = {};
        this.loadSounds();
    }

    async loadSounds() {
        const sounds = ['ritual_sound.mp3', 'destroy_sound.mp3'];
        for (const sound of sounds) {
            try {
                const response = await fetch(sound);
                const arrayBuffer = await response.arrayBuffer();
                this.audioBuffers[sound] = await this.audioContext.decodeAudioData(arrayBuffer);
            } catch (error) {
                console.error(`Error loading sound ${sound}:`, error);
            }
        }
    }

    playSound(soundFile, loop = false) {
        if (!this.audioBuffers[soundFile]) {
            console.error(`Sound ${soundFile} not loaded.`);
            return null;
        }
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffers[soundFile];
        source.connect(this.audioContext.destination);
        source.loop = loop;
        source.start(0);
        return source; // Return source to allow stopping it
    }

    getEgregores() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    saveEgregores(egregores) {
        localStorage.setItem(this.storageKey, JSON.stringify(egregores));
    }

    createEgregor(name, purpose, sigil, sigilType = 'image') {
        const egregores = this.getEgregores();
        const newEgregor = {
            id: `egregor_${Date.now()}`,
            name,
            purpose,
            sigil,
            sigilType,
            createdAt: new Date().toISOString(),
            lastMaintained: new Date().toISOString(),
        };
        egregores.push(newEgregor);
        this.saveEgregores(egregores);
    }

    destroyEgregor(id) {
        let egregores = this.getEgregores();
        egregores = egregores.filter(e => e.id !== id);
        this.saveEgregores(egregores);
    }
    
    isCanvasBlank(canvas) {
        const context = canvas.getContext('2d');
        const pixelBuffer = new Uint32Array(
            context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
        );
        return !pixelBuffer.some(color => color !== 0);
    }
    
    drawOnCanvas(canvas, event, isDrawing) {
        if (!isDrawing) return;
        event.preventDefault();

        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
        
        const rect = canvas.getBoundingClientRect();
        const pos = event.touches ? event.touches[0] : event;
        const x = pos.clientX - rect.left;
        const y = pos.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
}