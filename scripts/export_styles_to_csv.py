#!/usr/bin/env python3
"""Convert CSS files in assets/css into a flattened CSV for runtime loading."""
from __future__ import annotations

import csv
import re
from pathlib import Path

CSS_DIR = Path('assets/styles/source')
OUTPUT = Path('assets/styles/style-map.csv')
FILES = [
    ('core', CSS_DIR / 'style.css'),
    ('portfolio', CSS_DIR / 'portfolio.css'),
    ('resume', CSS_DIR / 'resume.css'),
    ('inline', CSS_DIR / 'inline-generated.css'),
]
INLINE_HTML = [
    ('resume', Path('resume.html')),
]

comment_re = re.compile(r'/\*.*?\*/', re.S)
style_block_re = re.compile(r'<style[^>]*>(.*?)</style>', re.S | re.I)

rows: list[tuple[str, str, str, str, str, int]] = []
order = 0


def strip_comments(text: str) -> str:
    return re.sub(comment_re, '', text)


def parse_declarations(block: str) -> list[tuple[str, str]]:
    decls: list[tuple[str, str]] = []
    for chunk in block.split(';'):
        chunk = chunk.strip()
        if not chunk or ':' not in chunk:
            continue
        prop, value = chunk.split(':', 1)
        prop = prop.strip()
        value = value.strip()
        if prop and value:
            decls.append((prop, value))
    return decls


def find_matching_brace(text: str, brace_index: int) -> int:
    depth = 0
    for idx in range(brace_index, len(text)):
        char = text[idx]
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return idx
    raise ValueError('Unbalanced braces in CSS content')


def collect_keyframes(content: str, bundle: str, context: str) -> None:
    global order
    i = 0
    length = len(content)
    while i < length:
        while i < length and content[i].isspace():
            i += 1
        if i >= length:
            break
        start = i
        brace_idx = content.find('{', start)
        if brace_idx == -1:
            break
        selector = content[start:brace_idx].strip()
        end_idx = find_matching_brace(content, brace_idx)
        block = content[brace_idx + 1:end_idx]
        for prop, value in parse_declarations(block):
            rows.append((bundle, context, selector, prop, value, order))
            order += 1
        i = end_idx + 1


def collect_rules(content: str, bundle: str, context: str = 'global') -> None:
    global order
    length = len(content)
    i = 0
    while i < length:
        while i < length and content[i].isspace():
            i += 1
        if i >= length:
            break
        if content.startswith('@import', i):
            end_idx = content.find(';', i)
            if end_idx == -1:
                end_idx = length
            value = content[i + len('@import'):end_idx].strip()
            rows.append((bundle, '@import', '', 'import', value, order))
            order += 1
            i = end_idx + 1
            continue
        if content.startswith('@media', i):
            brace_idx = content.find('{', i)
            if brace_idx == -1:
                break
            media_text = content[i:brace_idx].strip()
            end_idx = find_matching_brace(content, brace_idx)
            inner = content[brace_idx + 1:end_idx]
            collect_rules(inner, bundle, media_text)
            i = end_idx + 1
            continue
        if content.startswith('@keyframes', i):
            brace_idx = content.find('{', i)
            if brace_idx == -1:
                break
            keyframe_text = content[i:brace_idx].strip()
            end_idx = find_matching_brace(content, brace_idx)
            inner = content[brace_idx + 1:end_idx]
            collect_keyframes(inner, bundle, keyframe_text)
            i = end_idx + 1
            continue
        if content[i] == '@':
            # Skip unknown at-rules
            end_idx = content.find(';', i)
            if end_idx == -1:
                break
            i = end_idx + 1
            continue
        brace_idx = content.find('{', i)
        if brace_idx == -1:
            break
        selector = content[i:brace_idx].strip()
        end_idx = find_matching_brace(content, brace_idx)
        block = content[brace_idx + 1:end_idx]
        for prop, value in parse_declarations(block):
            rows.append((bundle, context, selector, prop, value, order))
            order += 1
        i = end_idx + 1


def main() -> None:
    for bundle, css_path in FILES:
        if not css_path.exists():
            continue
        text = css_path.read_text(encoding='utf-8')
        text = strip_comments(text)
        collect_rules(text, bundle)
    for bundle, html_path in INLINE_HTML:
        if not html_path.exists():
            continue
        html_text = html_path.read_text(encoding='utf-8')
        for block in re.findall(style_block_re, html_text):
            css_text = strip_comments(block)
            collect_rules(css_text, bundle)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open('w', encoding='utf-8', newline='') as fh:
        writer = csv.writer(fh)
        writer.writerow(['bundle', 'context', 'selector', 'property', 'value', 'order'])
        writer.writerows(rows)


if __name__ == '__main__':
    main()
