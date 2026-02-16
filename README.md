# ClawPad

**Half of what we type into AI agents is the same thing we typed yesterday.** ClawPad is a programmable physical macro pad that turns your most-used OpenClaw prompts into one-press actions — whether it's scheduling your standup, firing off an EOD report, or having your agent book a cab home.

Three buttons. One bridge. Zero typing.

---

## The Problem

You've got an AI agent that can do almost anything — schedule meetings, draft emails, manage your calendar, order food. But every time, you're typing out the same prompt. Copy-pasting from a notes file. Hunting through chat history for that command that worked last time.

The friction isn't the AI. It's the interface.

## The Fix

ClawPad sits on your desk and connects to OpenClaw over WiFi. Each button is mapped to a prompt you define — full sentences, complex instructions, multi-step workflows. Press the button, and your agent executes it instantly.

No app to open. No prompt to type. No tabs to find.

**One press. Done.**

---

## How It Works

```
Button press → ESP32 → WiFi → Bridge Server → WebSocket → OpenClaw chat → AI executes
```

The ESP32 sends a button ID over HTTP. A lightweight Python bridge server looks up the mapped prompt and pushes it into your OpenClaw browser tab via WebSocket. A tiny injector script types the message and clicks Send — exactly like you would, but in under a second.

---

## What You Can Map

Anything you'd type into OpenClaw. Some ideas:

- **"Schedule a 30-min sync with the team for tomorrow. Send calendar invites with a Meet link."**
- **"Summarize my Slack unreads from #engineering and #design. Flag anything urgent."**
- **"Draft an EOD report from today's completed Jira tickets. Email it to my manager."**
- **"Book an Uber from office to home, the cheapest option available."**
- **"Order my usual from Swiggy — last week's order from Mehfil."**

You configure these on a local web dashboard. Change them anytime — no reflashing the hardware.

---

## What's In The Box

| | |
|---|---|
| **ESP32 DevKit** | WiFi microcontroller — reads buttons, talks to your PC |
| **3 tactile buttons** | Wired to GPIO 12, 14, 27 — no resistors needed |
| **Bridge server** | Python script that routes button presses to OpenClaw |
| **Config dashboard** | Web UI at localhost:5000 — map buttons, test them, monitor activity |
| **Browser injector** | One-line paste into OpenClaw's console — types and sends for you |
| **3D-printable case** | STL files included for a clean desk-ready enclosure |

Total hardware cost: **under ₹500 / $6.**

---

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
button_config.json     ← Auto-generated config store
clawpad_setup_guide.pdf ← Printable setup guide
clawpad_base.stl       ← 3D print: bottom shell
clawpad_lid.stl        ← 3D print: top lid
clawpad_knob.stl       ← 3D print: encoder knob (optional variant)
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

*ClawPad — because the best prompt is the one you never have to type.*
