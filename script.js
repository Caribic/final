const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const ratioSelect = document.getElementById('ratioSelect');
const bgColorSelect = document.getElementById('bgColor');
const gapSizeInput = document.getElementById('gapSize');
const layoutSelect = document.getElementById('layoutSelect');
const fitModeSelect = document.getElementById('fitMode');
const gapValueLabel = document.getElementById('gapValue');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const thumbContainer = document.getElementById('thumbContainer');
const thumbList = document.getElementById('thumbList');

let images = [];

ratioSelect.addEventListener('change', renderCanvas);
bgColorSelect.addEventListener('change', renderCanvas);
layoutSelect.addEventListener('change', renderCanvas);
fitModeSelect.addEventListener('change', renderCanvas);
gapSizeInput.addEventListener('input', () => {
    gapValueLabel.textContent = gapSizeInput.value + ' px';
    renderCanvas();
});

// Podpora pro stahování a ukládání na iPhone (iOS Share API)
downloadBtn.addEventListener('click', async () => {
    if (images.length === 0) return;

    const dataUrl = canvas.toDataURL('image/png');

    if (navigator.canShare && navigator.share) {
        try {
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], 'moje-kolaz.png', { type: 'image/png' });

            await navigator.share({
                files: [file],
                title: 'Moje Koláž',
                text: 'Koláž vytvořená v aplikaci Caribic10'
            });
        } catch (error) {
            console.log('Sdílení bylo zrušeno nebo selhalo:', error);
        }
    } else {
        const link = document.createElement('a');
        link.download = 'moje-kolaz.png';
        link.href = dataUrl;
        link.click();
    }
});

resetBtn.addEventListener('click', () => {
    images = [];
    upload.value = '';
    thumbContainer.style.display = 'none';
    thumbList.innerHTML = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
});

function handleUpload(e) {
    images = [];
    const files = e.target.files;
    if (!files.length) {
        thumbContainer.style.display = 'none';
        return;
    }

    let loadedCount = 0;
    for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                images.push(img);
                loadedCount++;
                if (loadedCount === files.length) {
                    renderCanvas();
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(files[i]);
    }
}
upload.addEventListener('change', handleUpload);

function updateThumbnails() {
    thumbList.innerHTML = '';
    if (images.length === 0) {
        thumbContainer.style.display = 'none';
        return;
    }
    thumbContainer.style.display = 'block';

    images.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'thumb-item';

        const thumbImg = document.createElement('img');
        thumbImg.src = img.src;

        const controls = document.createElement('div');
        controls.className = 'thumb-controls';

        const moveLeft = document.createElement('button');
        moveLeft.className = 'thumb-nav-btn';
        moveLeft.textContent = '◀';
        moveLeft.disabled = index === 0;
        moveLeft.addEventListener('click', () => swapImages(index, index - 1));

        const moveRight = document.createElement('button');
        moveRight.className = 'thumb-nav-btn';
        moveRight.textContent = '▶';
        moveRight.disabled = index === images.length - 1;
        moveRight.addEventListener('click', () => swapImages(index, index + 1));

        controls.appendChild(moveLeft);
        controls.appendChild(moveRight);
        item.appendChild(thumbImg);
        item.appendChild(controls);
        thumbList.appendChild(item);
    });
}

function swapImages(idx1, idx2) {
    const temp = images[idx1];
    images[idx1] = images[idx2];
    images[idx2] = temp;
    renderCanvas();
}

function renderCanvas() {
    if (images.length === 0) return;

    updateThumbnails();

    const ratio = ratioSelect.value;
    const baseWidth = 600;

    if (ratio === '1:1') { canvas.width = baseWidth; canvas.height = baseWidth; }
    else if (ratio === '3:2') { canvas.width = baseWidth; canvas.height = Math.floor(baseWidth * (2 / 3)); }
    else if (ratio === '2:3') { canvas.width = baseWidth; canvas.height = Math.floor(baseWidth * (3 / 2)); }
    else if (ratio === '3:4') { canvas.width = baseWidth; canvas.height = Math.floor(baseWidth * (4 / 3)); }

    const themeColor = bgColorSelect.value;
    ctx.fillStyle = themeColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const count = images.length;
    const orientation = layoutSelect.value;
    let cols, rows;

    if (orientation === 'landscape') {
        cols = Math.ceil(Math.sqrt(count * (canvas.width / canvas.height)));
        rows = Math.ceil(count / cols);
        if ((cols - 1) * rows >= count) cols--;
    } else {
        rows = Math.ceil(Math.sqrt(count * (canvas.height / canvas.width)));
        cols = Math.ceil(count / rows);
        if ((rows - 1) * cols >= count) rows--;
    }

    const gap = parseInt(gapSizeInput.value);
    const cellWidth = (canvas.width - gap * (cols + 1)) / cols;
    const cellHeight = (canvas.height - gap * (rows + 1)) / rows;

    if (cellWidth <= 0 || cellHeight <= 0) return;

    const fitMode = fitModeSelect.value;

    images.forEach((img, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const cellX = gap + col * (cellWidth + gap);
        const cellY = gap + row * (cellHeight + gap);

        if (fitMode === 'cover') {
            drawCoveredImage(img, cellX, cellY, cellWidth, cellHeight);
        } else {
            drawContainedImage(img, cellX, cellY, cellWidth, cellHeight);
        }
    });
}

function drawCoveredImage(img, cellX, cellY, cellWidth, cellHeight) {
    const imgRatio = img.width / img.height;
    const cellRatio = cellWidth / cellHeight;
    let srcX, srcY, srcWidth, srcHeight;

    if (imgRatio > cellRatio) {
        srcHeight = img.height;
        srcWidth = img.height * cellRatio;
        srcX = (img.width - srcWidth) / 2;
        srcY = 0;
    } else {
        srcWidth = img.width;
        srcHeight = img.width / cellRatio;
        srcX = 0;
        srcY = (img.height - srcHeight) / 2;
    }
    ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, cellX, cellY, cellWidth, cellHeight);
}

function drawContainedImage(img, cellX, cellY, cellWidth, cellHeight) {
    const imgRatio = img.width / img.height;
    const cellRatio = cellWidth / cellHeight;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgRatio > cellRatio) {
        drawWidth = cellWidth;
        drawHeight = cellWidth / imgRatio;
        offsetX = cellX;
        offsetY = cellY + (cellHeight - drawHeight) / 2;
    } else {
        drawHeight = cellHeight;
        drawWidth = cellHeight * imgRatio;
        offsetX = cellX + (cellWidth - drawWidth) / 2;
        offsetY = cellY;
    }
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}
