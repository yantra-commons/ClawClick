<img width="1024" height="572" alt="image" src="https://github.com/user-attachments/assets/c12d657c-aa9c-4171-a76c-6bca80a1dc89" />

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

*ClawPad — because the best prompt is the one you never have to type.*
