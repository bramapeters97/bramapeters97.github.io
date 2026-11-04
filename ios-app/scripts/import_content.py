#!/usr/bin/env python3
"""Bundle the published portfolio into the native app. Requires Python 3 + Pillow.

index.html is the project/order/category authority; linked local case studies supply
native reading sections and galleries. No remote requests or runtime HTML parser.
Run from any directory; --check compares a temporary rebuild without changing files.
"""
from __future__ import annotations

import argparse
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile
from urllib.parse import quote, unquote, urljoin, urlsplit, urlunsplit

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "ios-app" / "Portfolio"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
SKIP = {"script", "style", "noscript", "nav", "svg", "button", "template", "dialog"}
BLOCKS = {"p", "li", "blockquote", "figcaption", "dt", "dd", "pre"}


class Node:
    def __init__(self, tag="", attrs=(), parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children: list[Node | str] = []

    def has(self, cls):
        return cls in self.attrs.get("class", "").split()

    def text(self):
        return re.sub(r"\s+", " ", self.raw_text()).strip()

    def raw_text(self):
        if self.tag in {"script", "style", "svg"}:
            return ""
        if self.tag == "br":
            return "\n"
        # Preserve authored inline joins, e.g. <b>Vi</b>deo<b>No</b>te<b>Bo</b>ok.
        return "".join(child.raw_text() if isinstance(child, Node) else child for child in self.children)

    def all(self, *, cls=None, tag=None, id=None):
        result = []
        for child in self.children:
            if isinstance(child, Node):
                if (cls is None or child.has(cls)) and (tag is None or child.tag == tag) and (id is None or child.attrs.get("id") == id):
                    result.append(child)
                result.extend(child.all(cls=cls, tag=tag, id=id))
        return result

    def first(self, **kwargs):
        return next(iter(self.all(**kwargs)), None)


class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack[-1].tag == tag:
            self.stack.pop()

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, text):
        self.stack[-1].children.append(text)


def read_doc(path):
    return Document(path.read_text(encoding="utf-8")).root


def text(node):
    return node.text() if node else ""


def labels(node):
    """Profile label rows use layout spacing absent from the HTML text itself."""
    if not node:
        return ""
    return re.sub(r"\s+", " ", " ".join(child.text() if isinstance(child, Node) else child for child in node.children)).strip()


def hidden(node):
    current = node
    while current:
        if "hidden" in current.attrs or current.attrs.get("aria-hidden") == "true":
            return True
        style = re.sub(r"\s", "", current.attrs.get("style", "")).lower()
        if "display:none" in style or "visibility:hidden" in style:
            return True
        current = current.parent
    return False


def local_path(root, page, raw):
    """Resolve an on-disk reference, rejecting schemes, traversal and symlink escape."""
    try:
        parsed = urlsplit(raw.strip())
    except ValueError:
        return None
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    decoded = unquote(parsed.path)
    if "\x00" in decoded or "\\" in decoded:
        return None
    candidate = (root / decoded.lstrip("/") if decoded.startswith("/") else page.parent / decoded).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError:
        return None
    return candidate


def public_url(base, page_relative, raw):
    """Only navigable HTTP(S) URLs. Preserve static media/docs as browser links."""
    raw = raw.strip()
    if not raw or raw.startswith("#"):
        return None
    try:
        parsed = urlsplit(raw)
    except ValueError:
        return None
    if parsed.scheme and parsed.scheme.lower() not in {"http", "https"}:
        return None
    if not parsed.scheme and not parsed.netloc:
        decoded = unquote(parsed.path)
        if "\\" in decoded or any(part == ".." for part in Path(decoded).parts):
            return None
    resolved = urlsplit(urljoin(urljoin(base, page_relative), raw))
    if resolved.scheme not in {"https", "http"} or not resolved.netloc or resolved.username or resolved.password:
        return None
    return urlunsplit((resolved.scheme, resolved.netloc, quote(unquote(resolved.path), safe="/!$&'()*+,;=:@-._~"), resolved.query, resolved.fragment))


class AssetBundler:
    def __init__(self, root, resources):
        self.root, self.resources = root, resources
        self.records = {}
        self.warnings = []

    def image(self, page, raw):
        source = local_path(self.root, page, raw)
        if not source or not source.is_file():
            if raw:
                self.warnings.append(f"Image unavailable offline: {raw}")
            return ""
        relative = source.relative_to(self.root).as_posix()
        key = sha256(relative.encode("utf-8")).hexdigest()[:16]
        output = f"Media/{key}.jpg"
        if relative in self.records:
            return output
        try:
            with Image.open(source) as image:
                image = ImageOps.exif_transpose(image)
                image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
                # Matte transparency on the website's pale studio background.
                rgba = image.convert("RGBA")
                canvas = Image.new("RGB", rgba.size, (241, 244, 249))
                canvas.paste(rgba, mask=rgba.getchannel("A"))
                destination = self.resources / output
                destination.parent.mkdir(parents=True, exist_ok=True)
                canvas.save(destination, format="JPEG", quality=85, optimize=True, progressive=True)
                self.records[relative] = {"path": output, "source": relative,
                                          "sourceSHA256": sha256(source.read_bytes()).hexdigest(),
                                          "width": canvas.width, "height": canvas.height}
                return output
        except (OSError, ValueError):
            self.warnings.append(f"Unsupported image, linked online instead: {relative}")
            return ""


def extract_sections(root, page, base, bundler):
    doc = read_doc(page)
    scope = doc.first(id="case-content") or doc.first(tag="main")
    if not scope:
        return []
    sections = []

    def section(title="Project details"):
        item = {"id": f"section-{len(sections) + 1}", "title": title,
                "paragraphs": [], "images": [], "links": []}
        sections.append(item)
        return item

    current = section()
    page_relative = page.relative_to(root).as_posix()

    def add_link(raw, title):
        url = public_url(base, page_relative, raw)
        if not url:
            return
        parsed = urlsplit(url)
        if parsed.netloc == urlsplit(base).netloc and parsed.path in {"/", "/index.html", "/contact.html"}:
            return
        item = {"title": title.strip() or "Open online", "url": url}
        if not any(link["url"] == url for link in current["links"]):
            current["links"].append(item)

    def visit(node, in_block=False):
        nonlocal current
        if node.tag in SKIP or hidden(node):
            return
        if node.tag in {"h1", "h2", "h3"}:
            title = node.text()
            if title:
                current = section(title)
            return
        is_block = node.tag in BLOCKS or node.has("skill-glass-card")
        if is_block and not in_block:
            value = node.text()
            if value:
                current["paragraphs"].append(value)
        if node.tag == "img":
            raw = node.attrs.get("src", "")
            path = bundler.image(page, raw)
            if path and not any(image["path"] == path for image in current["images"]):
                current["images"].append({"path": path, "alt": node.attrs.get("alt", "") or current["title"]})
            elif not path:
                add_link(raw, node.attrs.get("alt", "") or "View image online")
        elif node.tag in {"a", "iframe", "video", "audio", "source", "embed", "object"}:
            raw = node.attrs.get("href") if node.tag == "a" else node.attrs.get("src", node.attrs.get("data", ""))
            add_link(raw or "", node.attrs.get("title") or node.attrs.get("aria-label") or node.text() or "View media online")
        for child in node.children:
            if isinstance(child, Node):
                visit(child, in_block or is_block)

    visit(scope)
    for item in sections:
        # Case-study sidebars sometimes repeat the same link label as the body.
        item["paragraphs"] = list(dict.fromkeys(item["paragraphs"]))
    return [item for item in sections if any(item[key] for key in ("paragraphs", "images", "links"))]


def extract_profile(doc, bundler, page, base, email):
    about_heading = doc.first(cls="about")
    about = about_heading.parent.first(tag="p") if about_heading and about_heading.parent else None
    contacts = doc.first(cls="contact-card")
    contact_links = contacts.all(tag="a") if contacts else []
    location = next((a.text() for a in contact_links if "maps.google" in a.attrs.get("href", "")), "")
    profile_image = doc.first(cls="profile-pic")
    profile = {
        "name": labels(doc.first(cls="header-name")) or "Portfolio",
        "tagline": text(doc.first(cls="header-title")),
        "bio": text(about),
        "image": bundler.image(page, profile_image.attrs.get("src", "")) if profile_image else "",
        "location": location, "website": base.rstrip("/"), "email": email,
        "links": [], "skills": [], "experience": [], "education": [], "languages": [], "certificates": [],
    }
    socials = doc.first(cls="header-socials")
    if socials:
        for a in socials.all(tag="a"):
            url = public_url(base, "index.html", a.attrs.get("href", ""))
            if url:
                profile["links"].append({"title": a.text(), "url": url})
    for card in doc.all(cls="skill-glass-card"):
        profile["skills"].append({"title": text(card.first(cls="skill-title")), "detail": text(card.first(cls="skill-description"))})
    for item in doc.all(cls="experience-item"):
        title = text(item.first(cls="exp-title"))
        profile["experience"].append({"title": title, "organization": "", "period": text(item.first(cls="experience-dates")), "description": text(item.first(cls="experience-description"))})
    for cls, key in [("education-list", "education"), ("language-list", "languages")]:
        group = doc.first(cls=cls)
        if group:
            profile[key] = [labels(item) for item in group.all(tag="li")]
    certificates = doc.first(cls="certificates-grid")
    if certificates:
        profile["certificates"] = [labels(item) for item in certificates.all(tag="li")]
    source = page.read_text(encoding="utf-8")
    resume = re.search(r"window\.location\.href\s*=\s*['\"]([^'\"]+\.pdf)['\"]", source)
    if resume:
        profile["resumeURL"] = public_url(base, "index.html", resume.group(1))
    return profile


def generate(root, output):
    resources = output / "Resources"
    resources.mkdir(parents=True, exist_ok=True)
    bundler = AssetBundler(root, resources)
    home = root / "index.html"
    doc = read_doc(home)
    domain = (root / "CNAME").read_text().strip() if (root / "CNAME").is_file() else ""
    if not domain or not re.fullmatch(r"[A-Za-z0-9.-]+", domain):
        raise ValueError("CNAME must supply the existing public website domain")
    base = f"https://{domain}/"
    contact = read_doc(root / "contact.html")
    email = next((a.attrs["href"][7:].split("?")[0] for a in contact.all(tag="a") if a.attrs.get("href", "").startswith("mailto:")), "")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise ValueError("No valid existing contact email was found in contact.html")
    projects = []
    for card in doc.all(cls="portfolio-card"):
        if hidden(card) or card.attrs.get("data-project") == "next-project":
            continue
        project_id = card.attrs.get("data-project", "")
        if not project_id:
            continue
        body = card.first(cls="article-body") or card
        image = card.first(tag="img")
        item = {"id": project_id, "title": text(body.first(tag="h2")),
                "summary": text(body.first(tag="p")),
                "categories": [value.strip() for value in card.attrs.get("data-categories", "").split(",") if value.strip()],
                "image": bundler.image(home, image.attrs.get("src", "")) if image else "",
                "imageAlt": image.attrs.get("alt", "") if image else "", "sections": []}
        status = body.first(cls="project-status")
        if status:
            item["status"] = status.text()
        link = body.first(cls="portfolio-card-link") or body.first(tag="a")
        if link:
            raw = link.attrs.get("href", "")
            url = public_url(base, "index.html", raw)
            if url:
                item["url"] = url
            case = local_path(root, home, raw)
            if case and case.suffix.lower() == ".html" and case.is_file():
                item["sections"] = extract_sections(root, case, base, bundler)
        if item["title"]:
            projects.append(item)
    if not projects or len({project["id"] for project in projects}) != len(projects):
        raise ValueError("Portfolio must contain uniquely identified projects")
    services = [option.text() for option in contact.all(tag="option") if option.attrs.get("data-service")]
    content = {"schemaVersion": 1, "source": "Bundled from this repository's index.html, local case studies and contact.html. Updates require rebuilding the app.",
               "profile": extract_profile(doc, bundler, home, base, email), "projects": projects, "services": services}
    write_json(resources / "portfolio.json", content)
    write_json(resources / "asset-provenance.json", sorted(bundler.records.values(), key=lambda item: item["source"]))
    # Use the site's current flat favicon; unlike the studio mockup it has no baked-in rounded mask.
    icon_link = next((node for node in doc.all(tag="link") if node.attrs.get("rel") == "icon"), None)
    icon_source = local_path(root, home, icon_link.attrs.get("href", "")) if icon_link else None
    if not icon_source or not icon_source.is_file():
        icon_source = root / "assets/img/bram-peters-studio.png"
    with Image.open(icon_source) as icon:
        rgba = ImageOps.exif_transpose(icon).convert("RGBA")
        # Small non-square favicon is fitted, never stretched; iOS applies its own icon shape.
        rgba = ImageOps.contain(rgba, (1024, 1024), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (1024, 1024), (239, 241, 245))
        canvas.paste(rgba, ((1024-rgba.width)//2, (1024-rgba.height)//2), rgba)
        icon_dir = output / "Assets.xcassets/AppIcon.appiconset"
        icon_dir.mkdir(parents=True, exist_ok=True)
        canvas.save(icon_dir / "AppIcon.png", optimize=True)
    write_json(output / "Assets.xcassets/Contents.json", {"info": {"author": "xcode", "version": 1}})
    write_json(icon_dir / "Contents.json", {"images": [{"filename": "AppIcon.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}], "info": {"author": "xcode", "version": 1}})
    write_json(resources / "import-notes.json", {"iconSource": icon_source.relative_to(root).as_posix(),
                "iconNote": "Current website favicon fitted to opaque 1024×1024. Source is 237×244; replace website favicon with higher-resolution flat artwork for best App Store sharpness.",
                "warnings": sorted(set(bundler.warnings))})
    return content, bundler


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def generated_files(output):
    files = []
    for relative in ["Resources/portfolio.json", "Resources/asset-provenance.json", "Resources/import-notes.json", "Assets.xcassets/Contents.json"]:
        if (output / relative).is_file():
            files.append(Path(relative))
    for relative in ["Resources/Media", "Assets.xcassets/AppIcon.appiconset"]:
        if (output / relative).is_dir():
            files.extend(path.relative_to(output) for path in (output / relative).rglob("*") if path.is_file())
    return sorted(files)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify generated files match website content without modifying files")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="portfolio-import-") as temporary:
        output = Path(temporary)
        content, bundler = generate(ROOT, output)
        expected = generated_files(output)
        actual = generated_files(APP)
        mismatched = [str(path) for path in sorted(set(expected) | set(actual)) if not (APP/path).is_file() or not (output/path).is_file() or (APP/path).read_bytes() != (output/path).read_bytes()]
        if args.check:
            if mismatched:
                print("Generated content is stale. Run python3 ios-app/scripts/import_content.py", file=sys.stderr)
                for path in mismatched:
                    print(f"  {path}", file=sys.stderr)
                return 1
        else:
            for stale in set(actual) - set(expected):
                (APP/stale).unlink()
            for path in expected:
                (APP/path).parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(output/path, APP/path)
        size = sum((output/path).stat().st_size for path in expected)
        print(f"{'Verified' if args.check else 'Imported'} {len(content['projects'])} projects, {len(bundler.records)} offline images, {size/1024/1024:.1f} MiB.")
        for warning in sorted(set(bundler.warnings)):
            print(f"Note: {warning}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
