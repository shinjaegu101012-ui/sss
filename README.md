# 허스키렌즈2 손 운동 게임 — UNO R4 WiFi + PC

현재 사용할 소스는 `PointingGame/PointingGame.ino`와 `web/`입니다. `HandGame/`는 이전 물리 버튼 버전, `BuzzerBridge/`는 버저만 시험하는 별도 스케치입니다. 보드에는 PointingGame 하나만 업로드하세요.

## 게임

PC 화면의 고정된 다섯 자리에 숫자 1~5를 단계마다 무작위로 배치하고 1 → 2 → 3 → 4 → 5 순서로 선택합니다. 목표 위치에서 검지 끝을 0.7초 유지하면 기본 10점과 최대 5점의 움직임 보너스를 주고 버저를 울립니다. 단계 전체 제한 시간은 1단계 15초, 2단계 10초, 3단계 5초입니다. 5번까지 성공하면 다음 단계 시작 버튼으로 넘어가며 점수는 누적됩니다. 다음 단계 버튼을 누르기 전에는 시간이 흐르지 않습니다. 시간 초과 시 게임이 끝나고, 3단계를 완료하면 최종 성공입니다. 오답 감점은 없습니다.

**이 버전은 2D 검지 끝 위치를 보정해 선택합니다.** 손가락이 향하는 3D 방향이나 화면 접촉을 판정하지 않습니다. 같은 앉는 위치에서 각 숫자를 가리킬 때 손끝 영상 위치가 서로 달라야 합니다. 손을 같은 위치에 두고 방향만 바꾸면 구분되지 않을 수 있습니다. 위치가 너무 비슷하면 보정 저장을 거부합니다. 실제 장비에서 보정과 정확도를 확인해야 합니다.

움직임 보너스는 검지 끝과 손목 사이 거리를 손목~중지 뿌리 거리로 나눈 값의 변화에서 계산하는 시험용 지표입니다. 전체 관절 운동량이나 의료 평가가 아닙니다. 작은 흔들림과 큰 튐을 제외하고 보너스 상한을 둡니다. 실제 영상에 맞춘 조정이 필요합니다.

## 라이브러리와 업로드

공식 라이브러리: https://github.com/DFRobot/DFRobot_HuskylensV2

확인한 버전: 1.0.9, 커밋 `3753d9747e384783d739ccf1f198a73c07c49d06`.

Arduino IDE에서 Arduino UNO R4 Boards를 설치하고, 공식 라이브러리를 ZIP으로 받아 스케치 → 라이브러리 포함 → ZIP 라이브러리 추가로 설치하세요. `PointingGame/PointingGame.ino`를 열고 UNO R4 WiFi와 USB 포트를 선택해 검증·업로드합니다. 라이브러리는 architectures=*로 선언되어 있지만 실제 R4 컴파일과 하드웨어 호환성은 이 작업에서 검증하지 못했습니다.

주신 예제의 getHandCount/getCenterHandID/getCenterHandX/getCenterHandY/isExistHandID는 확인한 공식 라이브러리 API에 없습니다. 이 코드는 getResult(ALGORITHM_HAND_RECOGNITION), getCachedResultNum, getCachedCenterResult와 HandResult의 관절 좌표를 사용합니다. 손 하나가 보일 때만 데이터를 사용합니다.

## 배선

전원을 끄고 연결합니다.

- 허스키렌즈2 SDA → UNO R4 WiFi SDA, SCL → SCL, GND → GND. 센서 설정에서 I2C 통신을 선택합니다.
- 센서 전원은 제품의 전압·소비전류 규격에 맞게 공급합니다. 별도 전원을 쓸 경우 GND를 공통 연결합니다. 선 색보다 커넥터 핀 표기를 확인하세요.
- 수동 버저 신호 핀은 D8입니다. 정격 전류가 UNO R4 GPIO 허용 범위 이내인 제품만 +를 D8, −를 GND에 직접 연결할 수 있습니다. 정격이 불명확하거나 범위를 넘으면 트랜지스터 구동이 필요합니다.
- UNO와 PC는 USB 데이터 케이블로 연결합니다. Wi-Fi 설정은 필요하지 않습니다.

## PC 실행

PC에 저장소를 다운로드하고 저장소 폴더에서 Python 3로 실행합니다.

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory web
```

같은 PC의 Chrome 또는 Edge 주소창에서 `http://localhost:8000`을 엽니다. Arduino 시리얼 모니터를 닫고 **UNO 연결**을 눌러 포트를 선택합니다. 버저 연결과 좌표 수신은 Web Serial을 사용하므로 파일을 직접 열지 말고 로컬 서버로 실행하세요.

1. 카메라에 손이 잘 보이도록 카메라와 의자 위치를 고정합니다.
2. **위치 보정 시작**을 누릅니다.
3. 화면의 1번을 가리키고 손을 고정한 뒤 **현재 위치 저장**을 누릅니다. 보호자가 마우스로 저장을 도와줄 수 있습니다.
4. 2~5도 같은 방법으로 저장합니다. 구분되지 않는 위치는 저장되지 않습니다.
5. **게임 시작**을 누르고 노란 숫자를 차례대로 가리킵니다.

카메라·의자 위치가 달라지면 다시 보정합니다. 보정은 새로고침 후에도 다시 필요합니다. 여러 손이나 손 인식 누락, 300ms 이상 데이터 공백이 있으면 유지 판정을 초기화합니다. 게임 시간은 계속 흐릅니다. 연결 오류 시 USB 재연결 후 보정하세요.

PC 자체 프로토콜은 HAND와 검지 끝·검지 PIP·손목·중지 MCP의 x/y 값 8개, NONE, READY, ERROR입니다. PC → UNO 명령 C/F/S는 정답/종료/중지 소리입니다. 속도는 115200입니다.

## 검증과 남은 확인

```sh
node --test tests/pointing.test.mjs
```

좌표 파싱, 보정 영역, 유지 시간, 데이터 공백, 점수와 종료·재시작을 소프트웨어에서 확인합니다. 실제 UNO R4 빌드·업로드, I2C 통신, 손끝 정확도와 버저는 해당 장비에서 추가 검증해야 합니다. 이 저장소에 라이브러리 소스나 보드 패키지는 포함하지 않았습니다.

## GitHub Pages 서비스

`.github/workflows/pages.yml`은 main 브랜치 변경 시 게임 테스트 후 `web/`만 GitHub Pages에 배포합니다. Arduino 소스는 웹 배포 산출물에 포함하지 않습니다.

GitHub 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정하세요. main에 푸시하면 실행되고, 설정을 나중에 켰다면 **Actions → Deploy PC game to GitHub Pages → Run workflow**로 실행합니다. 배포 성공 후 Pages 설정 또는 Actions 실행 결과의 사이트 주소로 접속하세요.

HTTPS Pages 사이트에서도 PC Chrome/Edge의 Web Serial로 사용자 PC에 연결된 UNO를 선택할 수 있습니다. 사이트가 UNO에 스케치를 자동 업로드하지는 않습니다. 먼저 PointingGame 스케치를 설치하고 시리얼 모니터를 닫으세요. 접속한 PC마다 USB 연결 승인과 위치 보정이 필요합니다. 카메라 영상과 점수는 서버로 전송하지 않으며, 이 버전에는 계정이나 온라인 점수 저장 기능이 없습니다.

## UNO R4의 HandResult 컴파일 오류 해결

공식 라이브러리 1.0.9의 `Result.h`는 ESP 계열과 일부 NRF 보드에서만 `LARGE_MEMORY`를 활성화합니다. UNO R4는 조건에 없어 손 관절 타입과 디코딩 코드가 제외됩니다. 아래 수정은 라이브러리 전체에 적용해야 합니다. 스케치 상단에만 `#define LARGE_MEMORY`를 넣으면 라이브러리 cpp 파일과 구조가 달라져 올바른 수정이 아닙니다.

먼저 IDE의 보드가 **Arduino UNO R4 WiFi**인지 확인하세요. IDE 설정의 스케치북 위치 아래 `libraries/DFRobot_HuskylensV2/Result.h`를 찾아 다음 조건을 변경합니다.

기존:

```cpp
#if defined(ESP32) || defined(NRF5) || defined(ESP8266) || defined(NRF52833)
#define LARGE_MEMORY 1
#endif
```

변경:

```cpp
#if defined(ESP32) || defined(NRF5) || defined(ESP8266) || defined(NRF52833) || defined(ARDUINO_ARCH_RENESAS_UNO)
#define LARGE_MEMORY 1
#endif
```

또는 Python으로 `tools/patch_huskylens_r4.py`에 실제 라이브러리 폴더 경로를 전달하면 버전 확인과 원본 백업 후 같은 수정을 적용합니다. 라이브러리가 여러 개라면 IDE의 자세한 컴파일 출력에서 실제 사용된 경로를 확인하세요. IDE를 재시작한 뒤 다시 검증하세요. 라이브러리를 업데이트·재설치하면 수정이 사라질 수 있습니다.

이 수정은 공식 1.0.9 소스의 조건을 확인해 만든 로컬 호환성 패치입니다. 실제 UNO R4 타깃 빌드와 장비 동작은 아직 별도 확인이 필요합니다.

숫자가 이동해도 보정은 화면의 다섯 고정 자리 기준으로 유지됩니다. 단계마다 다시 보정할 필요는 없습니다. Arduino 스케치 변경 없이 웹페이지만 업데이트하면 됩니다.
