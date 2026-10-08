#include <Wire.h>
#include "DFRobot_HuskylensV2.h"
#ifndef LARGE_MEMORY
#error "Patch the library Result.h for UNO R4 as described in README.md; do not define LARGE_MEMORY only in this sketch."
#endif
HuskylensV2 huskylens;
const int BUZZER_PIN = 8;
bool cameraReady = false;
unsigned long lastPoll = 0, lastRetry = 0;
void setup() {
  Serial.begin(115200);
  Wire.begin();
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  huskylens.timeOutDuration = 300;
}
void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == 'C') tone(BUZZER_PIN, 1000, 120);
    else if (c == 'F') tone(BUZZER_PIN, 660, 450);
    else if (c == 'S') noTone(BUZZER_PIN);
  }
  unsigned long now = millis();
  if (!cameraReady) {
    if (now-lastRetry < 1000) return;
    lastRetry = now;
    cameraReady = huskylens.begin(Wire) && huskylens.switchAlgorithm(ALGORITHM_HAND_RECOGNITION);
    Serial.println(cameraReady ? "READY" : "ERROR camera");
    return;
  }
  if (now-lastPoll < 50) return;
  lastPoll = now;
  int count = huskylens.getResult(ALGORITHM_HAND_RECOGNITION);
  if (count < 0) { Serial.println("NONE"); cameraReady = false; return; }
  // Require exactly one hand, avoiding switches between users.
  if (huskylens.getCachedResultNum(ALGORITHM_HAND_RECOGNITION) != 1) {
    Serial.println("NONE"); return;
  }
  HandResult *r = static_cast<HandResult *>(huskylens.getCachedCenterResult(ALGORITHM_HAND_RECOGNITION));
  if (!r) { Serial.println("NONE"); return; }
  // Own USB protocol: INDEX,MCP x/y,PIP x/y,DIP x/y,TIP x/y.
  // Wrist and other fingers never enter the game data.
  Serial.print("INDEX,");
  Serial.print(r->index_finger_mcp_x); Serial.print(',');
  Serial.print(r->index_finger_mcp_y); Serial.print(',');
  Serial.print(r->index_finger_pip_x); Serial.print(',');
  Serial.print(r->index_finger_pip_y); Serial.print(',');
  Serial.print(r->index_finger_dip_x); Serial.print(',');
  Serial.print(r->index_finger_dip_y); Serial.print(',');
  Serial.print(r->index_finger_tip_x); Serial.print(',');
  Serial.println(r->index_finger_tip_y);
}
