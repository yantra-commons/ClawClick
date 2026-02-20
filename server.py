"""
ClawPad — Bridge Server
========================
Bridges ESP32 button presses to the OpenClaw browser tab.

Architecture:
  ESP32 --HTTP POST--> this server --WebSocket--> browser script in OpenClaw tab
  Config page (this server) lets users map buttons to actions.

Usage:
    pip install flask flask-socketio requests
    python server.py
"""

import json
import os
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit

app = Flask(__name__, template_folder=".", static_folder=".")
app.config["SECRET_KEY"] = "clawpad-secret"
socketio = SocketIO(app, cors_allowed_origins="*")


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, OPTIONS"
    return response


CONFIG_FILE = "button_config.json"

DEFAULT_CONFIG = {
    "buttons": {
        "1": {
            "label": "Schedule Meeting",
            "message": "Schedule a 30-minute meeting with the team for tomorrow afternoon. Send calendar invites with a Google Meet link. Topic: Weekly sync.",
            "color": "#6366f1",
            "gpio": 12,
            "enabled": True,
        },
        "2": {
            "label": "Standup Summary",
            "message": "Send the daily standup summary to the #engineering Slack channel. Include what I worked on yesterday, what I'm doing today, and any blockers.",
            "color": "#10b981",
            "gpio": 14,
            "enabled": True,
        },
        "3": {
            "label": "EOD Report",
            "message": "Create my end-of-day report summarizing today's completed tasks, pending items, and tomorrow's priorities. Email it to my manager.",
            "color": "#ef4444",
            "gpio": 27,
            "enabled": True,
        },
    },
    "settings": {
        "openclaw_url": "http://localhost:18789",
        "auto_send": True,
        "send_delay_ms": 500,
    },
}


def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return DEFAULT_CONFIG.copy()


def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


# ─── Routes ──────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(".", "config.html")

@app.route("/injector.js")
def injector():
    return send_from_directory(".", "openclaw_injector.js", mimetype="application/javascript")

@app.route("/logo.png")
def logo():
    return send_from_directory(".", "logo.png", mimetype="image/png")

@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify(load_config())

@app.route("/api/config", methods=["POST"])
def update_config():
    config = request.json
    save_config(config)
    socketio.emit("config_updated", config)
    return jsonify({"status": "ok"})

@app.route("/api/config/button/<button_id>", methods=["PUT"])
def update_button(button_id):
    config = load_config()
    if button_id in config["buttons"]:
        config["buttons"][button_id].update(request.json)
        save_config(config)
        socketio.emit("config_updated", config)
        return jsonify({"status": "ok"})
    return jsonify({"error": "Button not found"}), 404

@app.route("/api/button/<button_id>", methods=["POST"])
def button_pressed(button_id):
    config = load_config()
    button = config["buttons"].get(button_id)
    if not button:
        print(f"[WARN] Unknown button ID: {button_id}")
        return jsonify({"error": "Unknown button"}), 404
    if not button.get("enabled", True):
        print(f"[SKIP] Button {button_id} ({button['label']}) is disabled")
        return jsonify({"status": "disabled"}), 200

    print(f"\n[BUTTON] #{button_id} pressed: {button['label']}")
    print(f"[SEND]   {button['message'][:80]}...")

    payload = {
        "button_id": button_id,
        "label": button["label"],
        "message": button["message"],
        "auto_send": config["settings"].get("auto_send", True),
        "send_delay_ms": config["settings"].get("send_delay_ms", 500),
        "timestamp": datetime.now().isoformat(),
    }
    socketio.emit("execute_command", payload)
    socketio.emit("button_activity", payload)
    return jsonify({"status": "sent", "label": button["label"]})

@app.route("/api/test/<button_id>", methods=["POST"])
def test_button(button_id):
    return button_pressed(button_id)


# ─── WebSocket ───────────────────────────────────────────────

@socketio.on("connect")
def handle_connect():
    print("[WS] Client connected")

@socketio.on("register")
def handle_register(data):
    client_type = data.get("type", "unknown")
    print(f"[WS] Registered: {client_type}")
    emit("registered", {"status": "ok", "config": load_config()})

@socketio.on("disconnect")
def handle_disconnect():
    print("[WS] Client disconnected")

@socketio.on("injector_status")
def handle_injector_status(data):
    print(f"[STATUS] {data}")
    socketio.emit("command_status", data)


# ─── Main ────────────────────────────────────────────────────

if __name__ == "__main__":
    if not os.path.exists(CONFIG_FILE):
        save_config(DEFAULT_CONFIG)
    config = load_config()

    print("=" * 50)
    print("  ClawPad — Bridge Server")
    print("=" * 50)
    print(f"\n  Config page:  http://0.0.0.0:5000")
    print(f"  ESP32 target: http://<this-pc-ip>:5000/api/button/N")
    try:
        import simple_websocket
        print(f"  WebSocket:    OK (simple-websocket installed)")
    except ImportError:
        print(f"  WebSocket:    ⚠ Install simple-websocket for WS support!")
        print(f"                pip install simple-websocket")
    print(f"\n  Buttons:")
    for bid, btn in config["buttons"].items():
        s = "✓" if btn.get("enabled") else "✗"
        print(f"    [{s}] Button {bid} (GPIO {btn['gpio']}): {btn['label']}")
    print()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)