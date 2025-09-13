import os
import io
import base64
import datetime
import numpy as np
from PIL import Image
import tensorflow as tf
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# --- Config ---
MODEL_PATH = 'models/batik_optimized.tflite'
IMAGE_SIZE = (224, 224)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

BATIK_CLASSES = [
    {"name": "Batik Parang", "link": "#"},
    {"name": "Batik Sidoasih", "link": "#"},
    {"name": "Batik Sidomukti", "link": "#"},
    {"name": "Batik Truntum", "link": "#"}
]

# --- Load TFLite model ---
interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# --- Helper ---
def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).resize(IMAGE_SIZE)
    img_array = np.array(img).astype(np.float32)
    if img_array.ndim == 2:  # grayscale
        img_array = np.stack((img_array,)*3, axis=-1)
    elif img_array.shape[2] == 4:  # RGBA
        img_array = img_array[..., :3]
    img_array = img_array / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

def predict_batik(image_bytes):
    img = preprocess_image(image_bytes)
    interpreter.set_tensor(input_details[0]['index'], img)
    interpreter.invoke()
    output_data = interpreter.get_tensor(output_details[0]['index'])
    return output_data[0]

# --- Routes ---
@app.route('/')
def dashboard():
    return render_template('dashboard.html')

@app.route('/camera')
def camera_page():
    return render_template('camera.html')

@app.route('/predict_realtime', methods=['POST'])
def predict_realtime():
    data = request.json
    if not data or 'image' not in data:
        return jsonify({'error': 'Tidak ada data gambar yang disediakan'}), 400

    image_b64 = data['image'].split(',')[1]
    image_bytes = base64.b64decode(image_b64)

    try:
        predictions_raw = predict_batik(image_bytes)
        sorted_predictions = sorted([
            {"name": BATIK_CLASSES[i]["name"],
             "confidence": float(predictions_raw[i]),
             "link": BATIK_CLASSES[i]["link"]}
            for i in range(len(BATIK_CLASSES))
        ], key=lambda x: x["confidence"], reverse=True)
        return jsonify({
            'top_prediction': sorted_predictions[0],
            'all_predictions': sorted_predictions
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/upload_and_save', methods=['POST'])
def upload_and_save():
    data = request.json
    if not data or 'image' not in data:
        return jsonify({'error': 'Tidak ada data gambar yang disediakan'}), 400

    image_b64 = data['image'].split(',')[1]
    image_bytes = base64.b64decode(image_b64)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"capture_batik_{timestamp}.png"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    with open(filepath, 'wb') as f:
        f.write(image_bytes)

    return jsonify({'message': 'Gambar berhasil disimpan', 'filename': filename})

# --- Main (hanya untuk lokal) ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
