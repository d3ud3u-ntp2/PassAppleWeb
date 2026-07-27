from flask import Flask, render_template, send_from_directory, request, jsonify
import logging
import os
import base64
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, template_folder="templates")
app.logger.setLevel(logging.INFO)


@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"


@app.route("/apple", methods=["GET", "POST"])
def run_apple():
    if request.method == "GET":
        query = request.args.to_dict(flat=True)
        return render_template(
            "apple_client.html",
            title="PassApple JavaScript Handler",
            query=query,
            method=request.method,
        )

    try:
        data = request.get_json(silent=True) or {}
        image_data = data.get("image")
        if not image_data:
            return jsonify({"status": "error", "message": "No image data"}), 400

        header, encoded = image_data.split(",", 1)
        image_bytes = base64.b64decode(encoded)

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        file_name = f"sketch-{timestamp}.png"
        file_path = os.path.join(BASE_DIR, "output", file_name)
        with open(file_path, "wb") as f:
            f.write(image_bytes)

        return jsonify({
            "status": "success",
            "message": f"Saved as {file_name}",
            "path": f"/output/{file_name}",
        })
    except Exception as exc:
        app.logger.exception("Failed to save uploaded image")
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/api/composite", methods=["POST"])
def composite_images():
    data = request.get_json(silent=True) or {}
    base_image = data.get("baseImage", "")
    overlay_image = data.get("overlayImage", "")
    width = int(data.get("width", 0) or 0)
    height = int(data.get("height", 0) or 0)

    if not base_image or not overlay_image:
        return jsonify({"status": "error", "message": "baseImage and overlayImage are required"}), 400

    try:
        import base64
        from io import BytesIO
        from PIL import Image

        base_bytes = base64.b64decode(base_image.split(",", 1)[-1])
        overlay_bytes = base64.b64decode(overlay_image.split(",", 1)[-1])

        with Image.open(BytesIO(base_bytes)) as base_img, Image.open(BytesIO(overlay_bytes)) as overlay_img:
            base_img = base_img.convert("RGBA")
            overlay_img = overlay_img.convert("RGBA")

            if width and height:
                base_img = base_img.resize((width, height))
                overlay_img = overlay_img.resize((width, height))

            pixels = overlay_img.getdata()
            result = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
            result.paste(base_img, (0, 0))

            for y in range(overlay_img.height):
                for x in range(overlay_img.width):
                    r, g, b, a = overlay_img.getpixel((x, y))
                    if a > 0 and r > 240 and g > 240 and b > 240:
                        result.putpixel((x, y), (0, 0, 0, 0))
                    else:
                        if a > 0:
                            result.putpixel((x, y), (r, g, b, a))

            output_dir = os.path.join(BASE_DIR, "output")
            os.makedirs(output_dir, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            output_path = os.path.join(output_dir, f"{timestamp}.png")
            result.save(output_path)

            return jsonify({"status": "success", "path": f"/output/{os.path.basename(output_path)}"})
    except Exception as exc:
        app.logger.exception("Composite failed")
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/output/<path:filename>")
def serve_output(filename):
    return send_from_directory(os.path.join(BASE_DIR, "output"), filename)


@app.route("/static/<path:filename>")
def serve_static(filename):
    candidates = [
        os.path.join(BASE_DIR, "dist", filename),
        os.path.join(BASE_DIR, "input", filename),
        os.path.join(BASE_DIR, "output", filename),
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            base_dir = os.path.dirname(candidate)
            file_name = os.path.basename(candidate)
            return send_from_directory(base_dir, file_name)
    return "Not Found", 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

