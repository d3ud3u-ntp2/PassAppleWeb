import os
import base64
import time
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from config import Config

app = Flask(__name__)
CORS(app)
Config.init_app()

@app.route('/')
def index():
    return render_template('apple.html')

@app.route('/upload', methods=['POST'])
def upload_image():
    time.sleep(10)
    try:
        data = request.json
        image_data = data.get('image')
        if not image_data:
            return jsonify({"status": "error", "message": "No image data"}), 400

        # Remove the header from base64 string
        header, encoded = image_data.split(",", 1)
        image_bytes = base64.b64decode(encoded)

        file_name = f"sketch-{int(time.time())}.png"
        file_path = os.path.join(Config.UPLOAD_FOLDER, file_name)
        
        with open(file_path, "wb") as f:
            f.write(image_bytes)

        print(f"File saved: {file_path}")
        file_path2 = f"http://127.0.0.1:5000/static/output/apple-1769838974.png"
        return jsonify({"status": "success", "message": f"Saved as {file_name}", "path": file_path2})
    except Exception as e:
        print(f"Error saving image: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/status')
def status():
    return jsonify({
        "status": "online",
        "message": "Premium Dashboard is running smoothly."
    })

if __name__ == '__main__':
    app.run(debug=Config.DEBUG, port=Config.PORT)
