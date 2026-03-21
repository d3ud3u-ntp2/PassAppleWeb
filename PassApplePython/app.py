from flask import Flask, jsonify
import apple

app = Flask(__name__)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"
    
@app.route("/apple", methods=["GET", "POST"])
def run_apple():
    apple.run()
    return jsonify({
        "status": "success",
        "path": "https://example.com/path/to/result.png"
    })

