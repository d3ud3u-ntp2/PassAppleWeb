from flask import Flask, jsonify, send_from_directory, request
import apple
import os
import json
import base64
from datetime import datetime
import config
import logging

# Configure global basic logging to direct log records to standard output
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

app = Flask(__name__)
app.logger.setLevel(logging.INFO)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"
    
@app.route("/apple", methods=["GET", "POST"])
def run_apple():
    req_data = request.get_json(silent=True)
    if not req_data:
        print('file not get')
        try:
            sample_json_path = os.path.join("input", "input_json_sample.json")
            with open(sample_json_path, "r", encoding="utf-8") as f:
                req_data = json.load(f)
        except Exception as e:
            print(f"Error loading sample JSON: {e}")
    else:
        print('file get')
    if req_data and "image" in req_data:
        img_str = req_data["image"]
        if "base64," in img_str:
            img_str = img_str.split("base64,")[1]
        try:
            img_bytes = base64.b64decode(img_str)
            date_str = datetime.now().strftime("%y%m%d%H%M%S")
            input_filepath = os.path.join("output", f"inputapple{date_str}.png")
            with open(input_filepath, "wb") as f:
                f.write(img_bytes)
        except Exception as e:
            print(f"Error decoding image: {e}")

    if 'input_filepath' in locals():
        filename = apple.run(input_filepath)
    else:
        filename = apple.run()
    if filename:
        print(f"Generated image: {filename}")
        full_url = f"{config.BASE_URL.rstrip('/')}/output/{filename}"
        return jsonify({
            "status": "success",
            "path": full_url
        })
    else:
        return jsonify({
            "status": "error",
            "message": "Failed to generate image"
        }), 500

@app.route("/output/<path:filename>")
def serve_output(filename):
    return send_from_directory("output", filename)

