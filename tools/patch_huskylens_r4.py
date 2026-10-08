"""Enable hand result decoding throughout DFRobot_HuskylensV2 1.0.9 on R4.
Usage: python patch_huskylens_r4.py PATH_TO_LIBRARY
"""
from pathlib import Path
import argparse

OLD = '#if defined(ESP32) || defined(NRF5) || defined(ESP8266) || defined(NRF52833)'
NEW = OLD + ' || defined(ARDUINO_ARCH_RENESAS_UNO)'

def patch(root):
    root = Path(root)
    header = root / 'Result.h'
    text = header.read_text(encoding='utf-8')
    if NEW in text:
        print('UNO R4 support is already enabled.')
        return
    if text.count(OLD) != 1 or 'version=1.0.9' not in (root / 'library.properties').read_text(encoding='utf-8'):
        raise SystemExit('Unexpected library version or header. No files changed.')
    backup = root / 'Result.h.before-r4-patch'
    if backup.exists():
        raise SystemExit('Backup already exists. Inspect the library before retrying.')
    backup.write_bytes(header.read_bytes())
    header.write_text(text.replace(OLD, NEW, 1), encoding='utf-8')
    print('Enabled UNO R4 support in Result.h; original saved as Result.h.before-r4-patch.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('library_directory')
    patch(parser.parse_args().library_directory)
