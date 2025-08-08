import { Rosacruz } from './rosacruz.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = new RosacruzApp();
    app.init();
});

class RosacruzApp {
    constructor() {
        this.rosacruz = new Rosacruz();
        this.currentEgregorData = {};
        this.activeRitual = {
            interval: null,
            progress: 0,
            duration: 0,
            onFinish: null,
            audio: null
        };
    }

    init() {
        this.loadEgregores();
        this.setupEventListeners();
        this.resetCreationModal();
    }

    //---------------------------------
    // Event Listeners
    //---------------------------------
    setupEventListeners() {
        // Creation Modal
        document.getElementById('start-creation-btn').addEventListener('click', this.resetCreationModal.bind(this));
        document.getElementById('goto-step-2').addEventListener('click', this.handleStep1.bind(this));
        document.getElementById('goto-step-3').addEventListener('click', this.handleStep2.bind(this));
        document.getElementById('finish-creation-btn').addEventListener('click', this.handleStep3.bind(this));
        
        // Canvas
        const canvas = document.getElementById('sigil-canvas');
        let drawing = false;
        const startDrawing = (e) => {
            drawing = true;
            this.rosacruz.drawOnCanvas(canvas, e, drawing);
        };
        const stopDrawing = () => { drawing = false; canvas.getContext('2d').beginPath(); };
        const draw = (e) => this.rosacruz.drawOnCanvas(canvas, e, drawing);
        
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('touchstart', startDrawing);
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchmove', draw);

        document.getElementById('clear-canvas-btn').addEventListener('click', () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });

        // Symbol upload listeners
        document.getElementById('image-upload-input').addEventListener('change', this.handleImageUpload.bind(this));
        document.getElementById('video-upload-input').addEventListener('change', this.handleVideoUpload.bind(this));
        document.getElementById('video-url-input').addEventListener('input', this.handleVideoUrl.bind(this));


        // Rituals
        this.setupRitualButton('charge-btn', 15000, 'charge-progress', () => {
            document.getElementById('ritual-feedback').classList.remove('d-none');
            document.getElementById('charge-btn').classList.add('d-none');
        });
        
        this.setupRitualButton('maintain-charge-btn', 10000, 'maintain-progress', () => {
            document.getElementById('maintain-feedback').classList.remove('d-none');
            document.getElementById('maintain-charge-btn').classList.add('d-none');
            const egregorId = document.getElementById('maintain-modal').dataset.egregorId;
            const egregores = this.rosacruz.getEgregores();
            const egregor = egregores.find(e => e.id === egregorId);
            egregor.lastMaintained = new Date().toISOString();
            this.rosacruz.saveEgregores(egregores);
            this.loadEgregores();
        });

        // Destruction
        document.getElementById('destroy-confirm-input').addEventListener('input', (e) => {
            document.getElementById('goto-destroy-step-2').disabled = e.target.value !== 'DISOLVER';
        });
        document.getElementById('goto-destroy-step-2').addEventListener('click', this.handleDestroyStep1.bind(this));
        document.getElementById('destroy-animation-container').addEventListener('click', this.handleDestroyStep2.bind(this));

    }
    
    setupRitualButton(buttonId, duration, progressId, onFinishCallback) {
        const button = document.getElementById(buttonId);
        const ritualContainerId = buttonId === 'charge-btn' ? 'consecration-preview-container' : 'maintain-sigil-container';
        const ritualContainer = document.getElementById(ritualContainerId);

        const startRitual = () => {
            if (this.activeRitual.interval) return;
            const sigilElement = ritualContainer.querySelector('img, video');

            this.activeRitual.duration = duration;
            this.activeRitual.onFinish = onFinishCallback;
            this.activeRitual.audio = this.rosacruz.playSound('ritual_sound.mp3', true);
            if(sigilElement) sigilElement.classList.add('charging');

            this.activeRitual.interval = setInterval(() => {
                this.activeRitual.progress += 100;
                const percentage = (this.activeRitual.progress / this.activeRitual.duration) * 100;
                document.getElementById(progressId).style.width = `${Math.min(percentage, 100)}%`;
                if (this.activeRitual.progress >= this.activeRitual.duration) {
                    this.stopRitual(true);
                }
            }, 100);
        };
        
        button.addEventListener('mousedown', startRitual);
        button.addEventListener('touchstart', (e) => { e.preventDefault(); startRitual(); });
        button.addEventListener('mouseup', () => this.stopRitual(false));
        button.addEventListener('mouseleave', () => this.stopRitual(false));
        button.addEventListener('touchend', () => this.stopRitual(false));
    }

    stopRitual(completed) {
        if (!this.activeRitual.interval) return;
        
        clearInterval(this.activeRitual.interval);
        if (this.activeRitual.audio) this.activeRitual.audio.stop();
        
        const sigilElement = document.querySelector('.charging');
        if (sigilElement) sigilElement.classList.remove('charging');

        if (completed && this.activeRitual.onFinish) {
            this.activeRitual.onFinish();
        } else if (!completed) {
            this.activeRitual.progress = 0;
            const progressBars = document.querySelectorAll('.progress-bar');
            progressBars.forEach(bar => bar.style.width = '0%');
        }

        this.activeRitual = { interval: null, progress: 0, duration: 0, onFinish: null, audio: null };
    }

    //---------------------------------
    // UI Flow & Logic
    //---------------------------------
    resetCreationModal() {
        this.currentEgregorData = {};
        document.getElementById('form-step-1').reset();
        this.showStep('create', 1);

        // Reset step 2
        const canvas = document.getElementById('sigil-canvas');
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('image-upload-input').value = '';
        document.getElementById('image-preview').classList.add('d-none');
        document.getElementById('image-preview').src = '';
        document.getElementById('video-upload-input').value = '';
        document.getElementById('video-url-input').value = '';
        document.getElementById('video-preview').classList.add('d-none');
        document.getElementById('video-preview').src = '';
        const firstTab = new bootstrap.Tab(document.getElementById('draw-tab'));
        firstTab.show();

        // Reset step 3
        document.getElementById('charge-progress').style.width = '0%';
        document.getElementById('ritual-feedback').classList.add('d-none');
        document.getElementById('charge-btn').classList.remove('d-none');
        document.getElementById('consecration-preview-container').innerHTML = '';
    }

    showStep(flow, step) {
        document.querySelectorAll(`[id^="${flow}-step-"]`).forEach(el => el.classList.add('d-none'));
        document.getElementById(`${flow}-step-${step}`).classList.remove('d-none');
    }
    
    handleStep1() {
        const name = document.getElementById('egregor-name').value.trim();
        const purpose = document.getElementById('egregor-purpose').value.trim();
        if (name && purpose) {
            this.currentEgregorData.name = name;
            this.currentEgregorData.purpose = purpose;
            this.showStep('create', 2);
        } else {
            alert('Por favor, completa el nombre y el propósito.');
        }
    }

    handleStep2() {
        const activeTabId = document.querySelector('#symbol-method-tabs .nav-link.active').id;
        let sigilData = null;
        let sigilType = 'image'; // Default

        if (activeTabId === 'draw-tab') {
            const canvas = document.getElementById('sigil-canvas');
            if (this.rosacruz.isCanvasBlank(canvas)) {
                alert("Por favor, dibuja un símbolo para tu Egregor.");
                return;
            }
            sigilData = canvas.toDataURL('image/png');
        } else if (activeTabId === 'upload-image-tab') {
            const imgPreview = document.getElementById('image-preview');
            if (!imgPreview.src || imgPreview.classList.contains('d-none')) {
                alert("Por favor, sube una imagen.");
                return;
            }
            sigilData = imgPreview.src;
        } else if (activeTabId === 'upload-video-tab') {
            const videoPreview = document.getElementById('video-preview');
            if (!videoPreview.src || videoPreview.classList.contains('d-none')) {
                alert("Por favor, sube o enlaza un video.");
                return;
            }
            sigilData = videoPreview.src;
            sigilType = 'video';
        }
        
        this.currentEgregorData.sigil = sigilData;
        this.currentEgregorData.sigilType = sigilType;
        
        this.renderSigilPreview('consecration-preview-container', this.currentEgregorData.sigil, this.currentEgregorData.sigilType, {
            maxWidth: '200px',
            border: '1px solid #ccc'
        }, false);

        this.showStep('create', 3);
    }
    
    handleStep3() {
        this.rosacruz.createEgregor(this.currentEgregorData.name, this.currentEgregorData.purpose, this.currentEgregorData.sigil, this.currentEgregorData.sigilType);
        this.loadEgregores();
    }
    
    handleDestroyStep1() {
        this.showStep('destroy', 2);
    }
    
    handleDestroyStep2(event) {
        const container = event.currentTarget;
        if (container.dataset.clicked) return;
        container.dataset.clicked = true;

        const sigilElement = container.querySelector('img, video');
        if (sigilElement) sigilElement.classList.add('dissolving');
        this.rosacruz.playSound('destroy_sound.mp3');

        setTimeout(() => {
            document.getElementById('destroy-feedback').classList.remove('d-none');
            const egregorId = document.getElementById('destroy-modal').dataset.egregorId;
            this.rosacruz.destroyEgregor(egregorId);
            this.loadEgregores();
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('destroy-modal'));
                modal.hide();
            }, 2000);
        }, 2000);
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('image-preview').src = e.target.result;
                document.getElementById('image-preview').classList.remove('d-none');
            };
            reader.readAsDataURL(file);
        }
    }

    handleVideoUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const videoUrl = URL.createObjectURL(file);
            const videoPreview = document.getElementById('video-preview');
            videoPreview.src = videoUrl;
            videoPreview.classList.remove('d-none');
            document.getElementById('video-url-input').value = '';
        }
    }

    handleVideoUrl(event) {
        const url = event.target.value.trim();
        const videoPreview = document.getElementById('video-preview');
        if (url) {
            videoPreview.src = url;
            videoPreview.classList.remove('d-none');
            document.getElementById('video-upload-input').value = '';
        } else {
            videoPreview.classList.add('d-none');
            videoPreview.src = '';
        }
    }

    //---------------------------------
    // Data & Rendering
    //---------------------------------
    loadEgregores() {
        const egregores = this.rosacruz.getEgregores();
        const list = document.getElementById('egregores-list');
        const noEgregoresMsg = document.getElementById('no-egregores-message');
        list.innerHTML = '';
        list.appendChild(noEgregoresMsg);

        if (egregores.length === 0) {
            noEgregoresMsg.style.display = 'block';
        } else {
            noEgregoresMsg.style.display = 'none';
            egregores.forEach(egregor => {
                const card = this.createEgregorCard(egregor);
                list.insertBefore(card, noEgregoresMsg);
            });
        }
    }

    createEgregorCard(egregor) {
        const div = document.createElement('div');
        div.className = 'col';
        const cardTop = egregor.sigilType === 'video' 
            ? `<video src="${egregor.sigil}" class="card-img-top" muted loop autoplay playsinline></video>`
            : `<img src="${egregor.sigil}" class="card-img-top" alt="Símbolo de ${egregor.name}">`;

        div.innerHTML = `
            <div class="card h-100 text-white shadow">
                ${cardTop}
                <div class="card-body">
                    <h5 class="card-title">${egregor.name}</h5>
                    <p class="card-text">${egregor.purpose}</p>
                    <p class="card-text"><small class="text-white-50">Último mantenimiento: ${new Date(egregor.lastMaintained).toLocaleString()}</small></p>
                </div>
                <div class="card-footer bg-transparent border-top-0 text-center">
                    <button class="btn btn-info me-2 maintain-btn" data-id="${egregor.id}">Mantener</button>
                    <button class="btn btn-outline-danger destroy-btn" data-id="${egregor.id}">Disolver</button>
                </div>
            </div>
        `;
        div.querySelector('.maintain-btn').addEventListener('click', () => this.showMaintainModal(egregor.id));
        div.querySelector('.destroy-btn').addEventListener('click', () => this.showDestroyModal(egregor.id));
        return div;
    }

    renderSigilPreview(containerId, src, type, styles, autoplay = true) {
        const container = document.getElementById(containerId);
        container.innerHTML = ''; // Clear previous content
        let element;

        if (type === 'video') {
            element = document.createElement('video');
            element.src = src;
            element.controls = !autoplay;
            element.muted = true;
            element.autoplay = autoplay;
            element.loop = autoplay;
            element.playsinline = autoplay;
        } else { // 'image' or default
            element = document.createElement('img');
            element.src = src;
            element.alt = "Símbolo del Egregor";
        }

        Object.assign(element.style, styles);
        container.appendChild(element);
        return element;
    }
    
    showMaintainModal(id) {
        const egregor = this.rosacruz.getEgregores().find(e => e.id === id);
        if (!egregor) return;

        const modalEl = document.getElementById('maintain-modal');
        modalEl.dataset.egregorId = id;
        document.getElementById('maintain-name').textContent = egregor.name;
        
        this.renderSigilPreview('maintain-sigil-container', egregor.sigil, egregor.sigilType, {
            maxWidth: '200px',
            border: '1px solid #ccc'
        }, false);
        
        // Reset modal state
        document.getElementById('maintain-progress').style.width = '0%';
        document.getElementById('maintain-feedback').classList.add('d-none');
        document.getElementById('maintain-charge-btn').classList.remove('d-none');

        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
    
    showDestroyModal(id) {
        const egregor = this.rosacruz.getEgregores().find(e => e.id === id);
        if (!egregor) return;
        
        const modalEl = document.getElementById('destroy-modal');
        modalEl.dataset.egregorId = id;
        document.getElementById('destroy-name').textContent = egregor.name;

        this.renderSigilPreview('destroy-animation-container', egregor.sigil, egregor.sigilType, {
            maxWidth: '200px'
        }, false);
        
        // Reset modal state
        this.showStep('destroy', 1);
        document.getElementById('destroy-confirm-input').value = '';
        document.getElementById('goto-destroy-step-2').disabled = true;
        const sigilElement = document.querySelector('#destroy-animation-container > *');
        if (sigilElement) sigilElement.classList.remove('dissolving');
        document.getElementById('destroy-animation-container').dataset.clicked = "";
        document.getElementById('destroy-feedback').classList.add('d-none');

        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}