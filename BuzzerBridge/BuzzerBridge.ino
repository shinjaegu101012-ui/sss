// UNO R4 WiFi USB bridge for a passive buzzer.
// Serial commands at 115200: C=correct, F=finish, S=stop.
// Use a transistor driver if the buzzer exceeds the GPIO current rating.
const int BUZZER_PIN = 8;
unsigned long soundStarted = 0;
unsigned long soundDuration = 0;

void stopSound() {
  noTone(BUZZER_PIN);
  soundDuration = 0;
}

void playSound(unsigned int frequency, unsigned long duration) {
  stopSound();
  tone(BUZZER_PIN, frequency);
  soundStarted = millis();
  soundDuration = duration;
}

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.begin(115200);
}

void loop() {
  if (Serial.available()) {
    char command = Serial.read();
    if (command == 'C') playSound(1000, 120);
    else if (command == 'F') playSound(660, 450);
    else if (command == 'S') stopSound();
  }
  if (soundDuration && millis() - soundStarted >= soundDuration) stopSound();
}
