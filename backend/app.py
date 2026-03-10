from flask import Flask, request, jsonify
import numpy as np
import tensorflow as tf
from PIL import Image
import io
import base64

app = Flask(__name__)

# Load TFLite model and allocate tensors
interpreter = tf.lite.Interpreter(model_path="model/gesture_model_quant.tflite")
interpreter.allocate_tensors()

# Get input/output details
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Class names (must match training order!)
class_names = ['Fist', 'OK', 'Peace', 'Stop', 'Thumbs Up']

def preprocess_image(image_base64):
    img_data = base64.b64decode(image_base64)
    img = Image.open(io.BytesIO(img_data)).convert('RGB')
    img = img.resize((224, 224))
    img_array = np.array(img, dtype=np.float32) / 255.0
    img_array = np.expand_dims(img_array, axis=0)  # batch dimension
    return img_array

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        image_base64 = data['image']
        
        input_data = preprocess_image(image_base64)
        
        # For quantized model, input must be uint8/int8 – but our converter used float → check type
        # If model expects int8, we'd scale here; but since we used float rescale=1./255, keep float32
        interpreter.set_tensor(input_details[0]['index'], input_data)
        interpreter.invoke()
        
        output_data = interpreter.get_tensor(output_details[0]['index'])[0]
        pred_idx = np.argmax(output_data)
        confidence = float(output_data[pred_idx])
        
        return jsonify({
            'gesture': class_names[pred_idx],
            'confidence': confidence
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
