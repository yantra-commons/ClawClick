/*
 * ClawPad — ESP32 Firmware (3-Button)
 * ====================================
 * Sends button ID to the bridge server via HTTP POST.
 * The bridge handles message content and forwarding to OpenClaw.
 *
 * Wiring (each button connects GPIO → GND, no resistors needed):
 *
 *   Button 1: GPIO 12  (Schedule Meeting)
 *   Button 2: GPIO 14  (Standup Summary)
 *   Button 3: GPIO 27  (EOD Report)
 *   Status LED: GPIO 2  (built-in on most ESP32 boards)
 *
 * ─────────────────────────────────────────────────────────
 *   >>>  CONFIGURE THE 3 VALUES BELOW BEFORE UPLOADING  <<<
 * ─────────────────────────────────────────────────────────
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ════════════════════════════════════════════════════════════
//  CHANGE THESE THREE VALUES
// ════════════════════════════════════════════════════════════

const char* WIFI_SSID     = "XXX";       // Your WiFi network name
const char* WIFI_PASSWORD = "XXX";    // Your WiFi password
const char* BRIDGE_HOST   = "XXX";         // Your PC's LAN IP (run ipconfig to find it)

// ════════════════════════════════════════════════════════════

const int BRIDGE_PORT = 5000;  // Bridge server port (default, don't change unless you changed server.py)

// ─── Button Configuration ────────────────────────────────

struct Button {
  int pin;           // GPIO pin number
  const char* id;    // Button ID (must match config on bridge server)
  bool lastState;    // Previous reading (for debounce)
  unsigned long lastPress;  // Last press timestamp (for debounce)
};

Button buttons[] = {
  { 12, "1", HIGH, 0 },   // Button 1 → GPIO 12
  { 14, "2", HIGH, 0 },   // Button 2 → GPIO 14
  { 27, "3", HIGH, 0 },   // Button 3 → GPIO 27
};

const int NUM_BUTTONS    = sizeof(buttons) / sizeof(buttons[0]);
const int STATUS_LED     = 2;      // Built-in LED on most ESP32 boards
const unsigned long DEBOUNCE_MS = 300;  // Ignore re-presses within 300ms

// ─── LED Feedback ────────────────────────────────────────

void blink(int times, int on_ms = 100) {
  for (int i = 0; i < times; i++) {
    digitalWrite(STATUS_LED, HIGH);
    delay(on_ms);
    digitalWrite(STATUS_LED, LOW);
    if (i < times - 1) delay(on_ms);
  }
}

// ─── Send button press to bridge server ─────────────────

bool sendButtonPress(const char* buttonId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[!] WiFi not connected — skipping");
    return false;
  }

  HTTPClient http;
  String url = String("http://") + BRIDGE_HOST + ":" + BRIDGE_PORT + "/api/button/" + buttonId;

  Serial.printf("[>] POST %s\n", url.c_str());

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);  // 5 second timeout

  int code = http.POST("{}");

  if (code == 200 || code == 201) {
    String resp = http.getString();
    Serial.printf("[OK] %d: %s\n", code, resp.c_str());
    http.end();
    return true;
  } else {
    Serial.printf("[ERR] HTTP %d: %s\n", code, http.errorToString(code).c_str());
    http.end();
    return false;
  }
}

// ─── WiFi Connection ────────────────────────────────────

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WiFi] Connecting to \"%s\"", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    blink(2, 150);  // 2 blinks = success
  } else {
    Serial.println("\n[WiFi] FAILED — check SSID/password");
    Serial.println("[WiFi] Note: ESP32 only supports 2.4 GHz WiFi");
    blink(5, 50);   // 5 rapid blinks = error
  }
}

// ─── Setup ──────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║        ClawPad — 3-Button            ║");
  Serial.println("╚══════════════════════════════════════╝");
  Serial.printf("  Bridge: %s:%d\n", BRIDGE_HOST, BRIDGE_PORT);
  Serial.println();

  // Setup LED
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);

  // Setup buttons with internal pull-ups
  for (int i = 0; i < NUM_BUTTONS; i++) {
    pinMode(buttons[i].pin, INPUT_PULLUP);
    buttons[i].lastState = HIGH;   // Unpressed = HIGH (pull-up)
    buttons[i].lastPress = 0;
    Serial.printf("  Button %s → GPIO %d\n", buttons[i].id, buttons[i].pin);
  }

  Serial.println();

  // Connect to WiFi
  connectWiFi();

  Serial.println();
  Serial.println("  Ready! Press a button.");
  Serial.println("  ─────────────────────");
  Serial.println();
}

// ─── Main Loop ──────────────────────────────────────────

void loop() {
  unsigned long now = millis();

  // Reconnect WiFi every 30 seconds if disconnected
  static unsigned long lastWifiCheck = 0;
  if (now - lastWifiCheck > 30000) {
    lastWifiCheck = now;
    connectWiFi();
  }

  // Read all buttons
  for (int i = 0; i < NUM_BUTTONS; i++) {
    bool state = digitalRead(buttons[i].pin);

    // Detect press (HIGH → LOW transition, with debounce)
    if (state == LOW && buttons[i].lastState == HIGH && (now - buttons[i].lastPress) > DEBOUNCE_MS) {
      buttons[i].lastPress = now;

      Serial.printf("\n  >>> Button %s (GPIO %d) PRESSED <<<\n\n", buttons[i].id, buttons[i].pin);

      // LED on while sending
      digitalWrite(STATUS_LED, HIGH);
      bool ok = sendButtonPress(buttons[i].id);
      digitalWrite(STATUS_LED, LOW);

      // Feedback blink
      if (ok) {
        blink(2, 150);   // 2 blinks = sent OK
      } else {
        blink(5, 50);    // 5 rapid blinks = error
      }
    }

    buttons[i].lastState = state;
  }

  delay(10);  // Small delay to prevent CPU hogging
}
