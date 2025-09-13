// --- Ambil elemen HTML ---
const videoElement = document.getElementById('videoElement');
const startCameraButton = document.getElementById('startCameraButton');
const stopCameraButton = document.getElementById('stopCameraButton');
const classifyButton = document.getElementById('classifyButton');
const statusMessage = document.getElementById('statusMessage');

const modalTopPredictionText = document.getElementById('modalTopPredictionText');
const modalPredictionList = document.getElementById('modalPredictionList');
const classificationModal = document.getElementById('classificationModal');
const closeButton = document.querySelector('.close-button');
const modalCloseButton = document.getElementById('modalCloseButton');

let stream = null;

// --- Mulai Kamera ---
startCameraButton.addEventListener('click', async () => {
    statusMessage.textContent = "Memulai kamera...";
    statusMessage.style.color = "blue";
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;
        videoElement.play();

        statusMessage.textContent = "Kamera aktif.";
        statusMessage.style.color = "green";

        classifyButton.disabled = false;
        stopCameraButton.disabled = false;
        startCameraButton.disabled = true;
    } catch (err) {
        statusMessage.textContent = "Gagal mengakses kamera. Pastikan kamera terhubung dan izinkan akses.";
        statusMessage.style.color = "red";
        console.error(err);
    }
});

// --- Berhenti Kamera ---
stopCameraButton.addEventListener('click', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
        stream = null;

        classifyButton.disabled = true;
        stopCameraButton.disabled = true;
        startCameraButton.disabled = false;

        statusMessage.textContent = "Kamera dihentikan.";
        statusMessage.style.color = "orange";
    }
});

// --- Klasifikasi Batik ---
classifyButton.addEventListener('click', () => {
    if (!stream) {
        statusMessage.textContent = "Kamera belum aktif. Silakan mulai kamera dulu.";
        statusMessage.style.color = "orange";
        return;
    }

    statusMessage.textContent = "Menganalisis gambar...";
    statusMessage.style.color = "blue";

    // Ambil frame dari video
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const imageDataURL = canvas.toDataURL('image/jpeg', 0.9);

    // Kirim ke backend Flask
    fetch('/predict_realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataURL })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            statusMessage.textContent = `Error: ${data.error}`;
            statusMessage.style.color = "red";
            console.error('Prediction Error:', data.error);
            return;
        }

        statusMessage.textContent = "Analisis selesai!";
        statusMessage.style.color = "green";

        // Tampilkan hasil di modal dengan progress bar
        displayResultsInModal(data.top_prediction, data.all_predictions);
    })

});

// --- Fungsi untuk menampilkan hasil di modal ---
function displayResultsInModal(topPrediction, allPredictions) {
    modalTopPredictionText.textContent = `${topPrediction.name} (${(topPrediction.confidence*100).toFixed(2)}%)`;

    modalPredictionList.innerHTML = ''; // Kosongkan list sebelumnya

    allPredictions.forEach(prediction => {
        const confidencePercentage = (prediction.confidence*100).toFixed(2);
        const li = document.createElement('li');
        li.innerHTML = `
            <span style="width: 25%; display:inline-block;">${prediction.name}</span>
            <div class="confidence-bar-container">
                <div class="confidence-bar" style="width: ${confidencePercentage}%"></div>
            </div>
            <span>${confidencePercentage}%</span>
        `;
        modalPredictionList.appendChild(li);
    });

    classificationModal.style.display = 'flex';
}

// --- Tutup modal ---
closeButton.addEventListener('click', () => classificationModal.style.display = 'none');
modalCloseButton.addEventListener('click', () => classificationModal.style.display = 'none');

// --- Tutup modal jika klik di luar ---
window.addEventListener('click', (event) => {
    if (event.target == classificationModal) {
        classificationModal.style.display = 'none';
    }
});
