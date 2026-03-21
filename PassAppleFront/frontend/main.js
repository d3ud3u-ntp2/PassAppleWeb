const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const brushSizeInput = document.getElementById('brushSize');
const sizeValueSpan = document.getElementById('sizeValue');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');

const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const penBtn = document.getElementById('penBtn');
const eraserBtn = document.getElementById('eraserBtn');
const textBtn = document.getElementById('textBtn');

let isDrawing = false;
let currentTool = 'pen'; // 'pen', 'eraser', or 'text'
let lastX = 0;
let lastY = 0;

// Panning state
let panX = 0;
let panY = 0;
let startPanX = 0;
let startPanY = 0;
let isPanning = false;
let initialMidpoint = null;
let initialDistance = 0;
let scale = 1;
let startScale = 1;
const transformLayer = document.getElementById('transformLayer');

// History management
const MAX_HISTORY = 10;
const BG_COLOR = '#000000';
const STROKE_COLOR = '#ffffff';
let history = [];
let redoStack = [];

function saveState() {
    if (history.length >= MAX_HISTORY + 1) { // +1 because first state is initial
        history.shift();
    }
    history.push(canvas.toDataURL());
    redoStack = []; // Clear redo stack on new action
    updateButtons();
}

function updateButtons() {
    undoBtn.disabled = history.length <= 1;
    redoBtn.disabled = redoStack.length === 0;
    undoBtn.style.opacity = undoBtn.disabled ? '0.3' : '1';
    redoBtn.style.opacity = redoBtn.disabled ? '0.3' : '1';
}

// Initialize canvas size
function resizeCanvas() {
    // Save current content if it exists
    const tempImage = history.length > 0 ? canvas.toDataURL() : null;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentTool === 'pen' ? STROKE_COLOR : BG_COLOR;
    ctx.lineWidth = brushSizeInput.value;

    if (tempImage) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = tempImage;
    } else {
        saveState(); // Initial state
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Drawing logic
function startDrawing(e) {
    if (e.touches && e.touches.length === 2) {
        isPanning = true;
        isDrawing = false;
        initialMidpoint = getMidpoint(e.touches);
        initialDistance = getDistance(e.touches);
        startPanX = panX;
        startPanY = panY;
        startScale = scale;
        return;
    }

    if (currentTool === 'text') {
        const { x, y } = getCoordinates(e);
        const text = prompt(i18n.t('prompt-text'));
        if (text) {
            ctx.font = `bold ${brushSizeInput.value * 4}px 'Outfit', 'Noto Sans JP', sans-serif`;
            ctx.fillStyle = STROKE_COLOR;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x, y);
            saveState();
        }
        return;
    }
    isDrawing = true;
    const { x, y } = getCoordinates(e);
    [lastX, lastY] = [x, y];
}

function draw(e) {
    if (isPanning && e.touches && e.touches.length === 2) {
        const currentMidpoint = getMidpoint(e.touches);
        const currentDistance = getDistance(e.touches);

        // Handle Scale
        if (initialDistance > 0) {
            const newScale = startScale * (currentDistance / initialDistance);
            // Limit scale between 0.5 and 5
            scale = Math.min(Math.max(newScale, 0.5), 5);
        }

        // Handle Pan (relative to center of fingers)
        panX = startPanX + (currentMidpoint.x - initialMidpoint.x);
        panY = startPanY + (currentMidpoint.y - initialMidpoint.y);

        updateTransform();
        return;
    }

    if (!isDrawing) return;
    e.preventDefault();

    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    [lastX, lastY] = [x, y];
}

function stopDrawing() {
    if (isPanning) {
        isPanning = false;
        initialMidpoint = null;
        return;
    }
    if (isDrawing) {
        saveState();
    }
    isDrawing = false;
}

function getMidpoint(touches) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: ((touches[0].clientX + touches[1].clientX) / 2) - rect.left,
        y: ((touches[0].clientY + touches[1].clientY) / 2) - rect.top
    };
}

function getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }

    // Adjust for pan and scale
    // Coords on the canvas = (ScreenCoords - Pan) / Scale
    return {
        x: (x - panX) / scale,
        y: (y - panY) / scale
    };
}

function updateTransform() {
    transformLayer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

// Event Listeners
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('touchstart', startDrawing, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDrawing, { passive: false });

// Fruit Selection Logic (Handle via URL parameter)
const baseImage = document.getElementById('baseImage');
const urlParams = new URLSearchParams(window.location.search);
const fruit = urlParams.get('fruit');

const fruitMap = {
    'apple': 'static/images/apple_base.jpg',
    'maron': 'static/images/maron_base.png',
    'radish': 'static/images/radish_base.png',
    'watermelon': 'static/images/watermeron_base.png'
};

if (fruit && fruitMap[fruit]) {
    baseImage.src = fruitMap[fruit];
}

// Controls
// Tool Switching
penBtn.addEventListener('click', () => {
    currentTool = 'pen';
    ctx.strokeStyle = STROKE_COLOR;
    penBtn.classList.add('active');
    eraserBtn.classList.remove('active');
    textBtn.classList.remove('active');
});

eraserBtn.addEventListener('click', () => {
    currentTool = 'eraser';
    ctx.strokeStyle = BG_COLOR;
    eraserBtn.classList.add('active');
    penBtn.classList.remove('active');
    textBtn.classList.remove('active');
});

textBtn.addEventListener('click', () => {
    currentTool = 'text';
    textBtn.classList.add('active');
    penBtn.classList.remove('active');
    eraserBtn.classList.remove('active');
});

brushSizeInput.addEventListener('input', (e) => {
    const size = e.target.value;
    ctx.lineWidth = size;
    sizeValueSpan.textContent = `${size}px`;
});

undoBtn.addEventListener('click', () => {
    if (history.length > 1) {
        redoStack.push(history.pop());
        const state = history[history.length - 1];
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = state;
        updateButtons();
    }
});

redoBtn.addEventListener('click', () => {
    if (redoStack.length > 0) {
        const state = redoStack.pop();
        history.push(state);
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = state;
        updateButtons();
    }
});

clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
});

const resultModal = document.getElementById('resultModal');
const loadingOverlay = document.getElementById('loadingOverlay');
const closeModal = document.getElementById('closeModal');
const resultImage = document.getElementById('resultImage');
const downloadBtn = document.getElementById('downloadBtn');

saveBtn.addEventListener('click', () => {
    const imageData = canvas.toDataURL('image/png');

    // Save to server
    saveBtn.disabled = true;
    saveBtn.textContent = i18n.t('saving');
    loadingOverlay.classList.remove('hidden');

    fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
    })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            if (data.status === 'success' && data.path) {
                // Show the modal with the returned image path
                resultImage.src = data.path;
                resultModal.classList.remove('hidden');
            } else {
                alert(i18n.t('error-no-path'));
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            alert(i18n.t('error-save'));
        })
        .finally(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = i18n.t('save');
            loadingOverlay.classList.add('hidden');
        });
});

closeModal.addEventListener('click', () => {
    resultModal.classList.add('hidden');
});

resultModal.addEventListener('click', (e) => {
    if (e.target === resultModal) {
        resultModal.classList.add('hidden');
    }
});

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = resultImage.src;
    link.download = 'result.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
