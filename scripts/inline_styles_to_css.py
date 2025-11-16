#!/usr/bin/env python3
"""Normalize inline style attributes into data-style tokens and CSS source."""
from __future__ import annotations

import re
from pathlib import Path

HTML_FILES = sorted(Path('.').glob('*.html'))
OUTPUT_CSS = Path('assets/styles/source/inline-generated.css')
STYLE_RE = re.compile(r'style="([^"]+)"')


def normalize(style: str) -> str:
    parts = []
    for chunk in style.split(';'):
        chunk = chunk.strip()
        if not chunk:
            continue
        parts.append(chunk)
    return '; '.join(parts)


def split_declarations(style: str) -> list[str]:
    decls = []
    for chunk in style.split(';'):
        chunk = chunk.strip()
        if not chunk:
            continue
        if ':' not in chunk:
            continue
        decls.append(chunk)
    return decls


def main() -> None:
    style_to_token: dict[str, str] = {}
    for path in HTML_FILES:
        text = path.read_text(encoding='utf-8')
        for match in STYLE_RE.finditer(text):
            normalized = normalize(match.group(1))
            if normalized not in style_to_token:
                token = f'inline-style-{len(style_to_token) + 1:03d}'
                style_to_token[normalized] = token

    if not style_to_token:
        return

    for path in HTML_FILES:
        text = path.read_text(encoding='utf-8')

        def repl(match: re.Match[str]) -> str:
            normalized = normalize(match.group(1))
            token = style_to_token.get(normalized)
            if not token:
                return match.group(0)
            return f'data-style="{token}"'

        text = STYLE_RE.sub(repl, text)
        path.write_text(text, encoding='utf-8')

    OUTPUT_CSS.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    for normalized, token in style_to_token.items():
        lines.append(f'[data-style="{token}"] {{')
        for declaration in split_declarations(normalized):
            lines.append(f'  {declaration};')
        lines.append('}')
        lines.append('')
    OUTPUT_CSS.write_text('\n'.join(lines).strip() + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
