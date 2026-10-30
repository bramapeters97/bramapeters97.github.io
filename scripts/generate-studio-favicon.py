"""Export the legacy browser favicon from the canonical Studio PNG (Pillow)."""
from pathlib import Path

from PIL import Image


def main():
    root = Path(__file__).resolve().parents[1]
    source = root / 'assets/img/bram-peters-studio.png'
    destination = root / 'favicon.ico'
    with Image.open(source) as image:
        image.convert('RGBA').save(
            destination,
            format='ICO',
            sizes=[(16, 16), (32, 32), (48, 48)],
            bitmap_format='bmp',
        )
    print('Generated favicon.ico from assets/img/bram-peters-studio.png.')


if __name__ == '__main__':
    main()
