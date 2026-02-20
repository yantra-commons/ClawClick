## Setup

**Software** (2 minutes):
```
pip install flask flask-socketio requests
python server.py
```
Open `localhost:5000`, map your buttons, paste the injector into OpenClaw's console.

**Hardware** (10 minutes):
1. Wire 3 buttons: each one connects a GPIO pin to GND
2. Open `esp32_clawpad.ino` in Arduino IDE
3. Set your WiFi name, password, and PC's IP address
4. Upload → plug in → press buttons

Full step-by-step in the [setup guide PDF](clawpad_setup_guide.pdf).

---

## Wiring

```
GPIO 12 ──[ Button 1 ]── GND
GPIO 14 ──[ Button 2 ]── GND
GPIO 27 ──[ Button 3 ]── GND
```

Internal pull-ups. No resistors. No soldering if you use a breadboard.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Hardware | ESP32 DevKit, 6×6mm tactile switches |
| Firmware | Arduino C++ — HTTP POST over WiFi |
| Bridge | Python, Flask, Flask-SocketIO |
| Injector | Vanilla JS — DOM manipulation via WebSocket |
| Config | Single-page web app at localhost:5000 |
| Target | OpenClaw chat interface at localhost:18789 |

---

## Files

```
server.py              ← Bridge server (start this first)
config.html            ← Web dashboard (auto-served at :5000)
openclaw_injector.js   ← Browser script (paste into OpenClaw console)
esp32_clawpad.ino      ← ESP32 firmware (flash via Arduino IDE)
logo.png               ← ClawPad logo
requirements.txt       ← Python deps
```

---

## FAQ

**Do I need to reflash the ESP32 to change button actions?**
No. Button prompts are configured on the web dashboard and stored on your PC. The ESP32 only sends a button number — the server handles the rest.

**Does it work without the 3D-printed case?**
Yes. A breadboard and loose wires work fine. The case is cosmetic.

**Can I add more buttons?**
Yes. Click "+ Add Button Mapping" on the config page, pick a free GPIO, and wire it up. Supports up to 8.

**What if OpenClaw updates its UI?**
The injector targets CSS selectors. If they break, run `window.__macropad.findChatInput()` in the console to debug. Update the selectors in `openclaw_injector.js`.

**Can I use this with other chat interfaces?**
In theory, yes — swap the DOM selectors in the injector to match any web-based chat UI.

---
