#include <Arduino_LED_Matrix.h>

// UNO R4 WiFi: each normally-open button connects its pin to GND.
const uint8_t BUTTON_PINS[] = {2, 3, 4, 5, 6};
const unsigned long GAME_MS = 60000;
const unsigned long DEBOUNCE_MS = 35;
const unsigned long FEEDBACK_MS = 700;
ArduinoLEDMatrix matrix;
const uint8_t DIGITS[5][5][3] = {
  {{0,1,0},{1,1,0},{0,1,0},{0,1,0},{1,1,1}},
  {{1,1,1},{0,0,1},{1,1,1},{1,0,0},{1,1,1}},
  {{1,1,1},{0,0,1},{1,1,1},{0,0,1},{1,1,1}},
  {{1,0,1},{1,0,1},{1,1,1},{0,0,1},{0,0,1}},
  {{1,1,1},{1,0,0},{1,1,1},{0,0,1},{1,1,1}}
};
uint8_t frame[8][12];
bool rawState[5], stableState[5];
unsigned long changedAt[5];
unsigned long startedAt, feedbackAt;
uint16_t score = 0;
uint8_t target = 1, movementBonus = 0;
bool running = false, feedback = false;

void showNumber(uint8_t number) {
  memset(frame, 0, sizeof(frame));
  for (uint8_t y=0; y<5; ++y)
    for (uint8_t x=0; x<3; ++x)
      frame[y+1][x+4] = DIGITS[number-1][y][x];
  matrix.renderBitmap(frame, 8, 12);
}

void nextTarget() {
  uint8_t previous = target;
  do { target = random(1, 6); } while (target == previous);
  movementBonus = 0;
  showNumber(target);
  Serial.print("TARGET "); Serial.println(target);
}

void startGame() {
  score = 0;
  feedback = false;
  running = true;
  startedAt = millis();
  Serial.println("START 60 seconds");
  nextTarget();
}

// Integration boundary: call only with a validated movement event from
// the actual camera adapter. No camera protocol is assumed in this sketch.
void onHandMovement() {
  if (running && !feedback && movementBonus < 5) ++movementBonus;
}

void pressed(uint8_t number) {
  if (!running) { startGame(); return; }
  if (feedback) return;
  if (number != target) {
    Serial.println("TRY AGAIN");
    return;
  }
  score += 10 + movementBonus;
  Serial.print("CORRECT bonus="); Serial.print(movementBonus);
  Serial.print(" score="); Serial.println(score);
  feedback = true;
  feedbackAt = millis();
  memset(frame, 0, sizeof(frame));
  frame[3][3]=1; frame[4][4]=1; frame[5][5]=1;
  frame[4][6]=1; frame[3][7]=1; frame[2][8]=1;
  matrix.renderBitmap(frame, 8, 12);
}

void setup() {
  Serial.begin(115200);
  matrix.begin();
  randomSeed(analogRead(A0)); // Leave A0 unconnected.
  for (uint8_t i=0; i<5; ++i) {
    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
    rawState[i] = stableState[i] = digitalRead(BUTTON_PINS[i]);
  }
  showNumber(1);
  Serial.println("Press any button to start. Serial S also starts a game.");
}

void loop() {
  const unsigned long now = millis();
  if (running && now-startedAt >= GAME_MS) {
    running = false;
    feedback = false;
    memset(frame, 0, sizeof(frame));
    matrix.renderBitmap(frame, 8, 12);
    Serial.print("FINISH score="); Serial.println(score);
    Serial.println("Press any button to restart.");
  }
  if (running && feedback && now-feedbackAt >= FEEDBACK_MS) {
    feedback = false;
    nextTarget();
  }
  for (uint8_t i=0; i<5; ++i) {
    bool value = digitalRead(BUTTON_PINS[i]);
    if (value != rawState[i]) { rawState[i]=value; changedAt[i]=now; }
    if (now-changedAt[i] >= DEBOUNCE_MS && stableState[i]!=value) {
      stableState[i]=value;
      if (value==LOW) pressed(i+1);
    }
  }
  // Serial input supports desktop-assisted testing without five buttons.
  if (Serial.available()) {
    char c = Serial.read();
    if (c=='S' || c=='s') startGame();
    else if (c>='1' && c<='5') pressed(c-'0');
  }
}
