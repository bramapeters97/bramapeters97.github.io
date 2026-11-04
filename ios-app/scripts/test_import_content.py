"""Behavior tests for the actual HTML-to-native content boundary.

python3 -m unittest discover -s ios-app/scripts -p 'test_*.py' -v
"""
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image

from import_content import AssetBundler, Document, extract_sections, generate, generated_files, local_path, public_url


class ImportTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "site"
        self.root.mkdir()
        (self.root / "assets").mkdir()
        Image.new("RGBA", (2200, 1100), (255, 0, 0, 128)).save(self.root / "assets/cover.png")
        Image.new("RGBA", (237, 244), (20, 30, 40, 255)).save(self.root / "assets/icon.png")
        (self.root / "CNAME").write_text("portfolio.example")
        (self.root / "contact.html").write_text('<a href="mailto:studio@example.com">Contact</a><option data-service="web">Web &amp; App</option>')
        (self.root / "case.html").write_text('''<header><h2>Not case content</h2></header>
          <main id="case-content"><article><h2>Research &amp; results</h2>
          <p>A <b>useful</b> finding.</p><blockquote>A quoted observation.</blockquote>
          <img src="assets/cover.png" alt="First result"><img src="assets/missing.png" alt="Missing result">
          <a href="https://external.example/demo">Try demo</a><iframe src="assets/prototype.html" title="Interactive prototype"></iframe>
          <video><source src="assets/film.mp4"></video></article>
          <article><h2>Gallery</h2><img src="assets/cover.png" alt="Second result"><p>End.</p></article>
          <nav><p>Do not import navigation</p></nav></main>''')
        (self.root / "index.html").write_text('''<link rel="icon" href="assets/icon.png">
          <h1 class="header-name"><b>Studio</b><span>| Name</span></h1><div class="header-title">Make things</div>
          <img class="profile-pic" src="assets/cover.png"><div><div class="about">About</div><p>Real biography.</p></div>
          <ul class="education-list"><li><strong>MSc Design</strong><span>University</span></li></ul>
          <!-- <article class="portfolio-card" data-project="commented"><h2>Draft</h2></article> -->
          <article class="portfolio-card" data-project="second" data-categories="UX/UI-design,Web Development">
            <img src="assets/cover.png" alt="Cover"><div class="article-body"><h2>Published first</h2><p>Useful summary.</p>
            <a class="portfolio-card-link" href="case.html">Read</a></div></article>
          <article class="portfolio-card portfolio-card--disabled" data-project="preview" data-categories="App Development">
            <img src="assets/cover.png"><div class="article-body"><h2>Coming app</h2><p>Coming summary.</p>
            <button class="project-status">Coming soon</button></div></article>
          <article class="portfolio-card" data-project="hidden" hidden><h2>Hidden</h2></article>
          <article class="portfolio-card" data-project="next-project"><h2>Contact CTA</h2></article>''')

    def test_order_categories_and_preview_only_project_are_preserved(self):
        data, _ = generate(self.root, Path(self.temporary.name) / "out")
        self.assertEqual([project["id"] for project in data["projects"]], ["second", "preview"])
        self.assertEqual(data["projects"][0]["categories"], ["UX/UI-design", "Web Development"])
        self.assertEqual(data["projects"][1]["status"], "Coming soon")
        self.assertNotIn("url", data["projects"][1], "Preview-only cards must not gain a fabricated destination")
        self.assertEqual(data["profile"]["email"], "studio@example.com")
        self.assertEqual(data["services"], ["Web & App"])

    def test_inline_labels_and_entities_are_readable_without_web_css(self):
        data, _ = generate(self.root, Path(self.temporary.name) / "out")
        self.assertEqual(data["profile"]["name"], "Studio | Name")
        self.assertEqual(data["profile"]["education"], ["MSc Design University"])
        self.assertEqual(data["projects"][0]["sections"][0]["paragraphs"][0], "A useful finding.")
        doc = Document('<h2><b>Vi</b>deo<b>No</b>te<b>Bo</b>ok</h2><p>A <i>useful </i> finding!</p>').root
        self.assertEqual(doc.first(tag="h2").text(), "VideoNoteBook")
        self.assertEqual(doc.first(tag="p").text(), "A useful finding!")

    def test_case_prose_gallery_and_media_survive_missing_image(self):
        data, bundler = generate(self.root, Path(self.temporary.name) / "out")
        sections = data["projects"][0]["sections"]
        self.assertEqual([s["title"] for s in sections], ["Research & results", "Gallery"])
        self.assertEqual(sections[0]["paragraphs"], ["A useful finding.", "A quoted observation."])
        self.assertEqual([len(s["images"]) for s in sections], [1, 1])
        links = {link["url"] for link in sections[0]["links"]}
        self.assertIn("https://external.example/demo", links)
        self.assertIn("https://portfolio.example/assets/prototype.html", links)
        self.assertIn("https://portfolio.example/assets/film.mp4", links)
        self.assertTrue(any("missing.png" in warning for warning in bundler.warnings))
        self.assertNotIn("Do not import navigation", json.dumps(data))

    def test_media_is_bounded_opaque_and_original_is_untouched(self):
        original = (self.root / "assets/cover.png").read_bytes()
        out = Path(self.temporary.name) / "out"
        data, _ = generate(self.root, out)
        with Image.open(out / "Resources" / data["projects"][0]["image"]) as image:
            self.assertEqual(image.size, (1600, 800))
            self.assertEqual(image.mode, "RGB")
        with Image.open(out / "Assets.xcassets/AppIcon.appiconset/AppIcon.png") as image:
            self.assertEqual(image.size, (1024, 1024))
            self.assertEqual(image.mode, "RGB", "App Store icons must be opaque")
        self.assertEqual((self.root / "assets/cover.png").read_bytes(), original)

    def test_output_is_deterministic_and_offline_paths_exist(self):
        first, second = Path(self.temporary.name) / "first", Path(self.temporary.name) / "second"
        data, _ = generate(self.root, first)
        generate(self.root, second)
        self.assertEqual(generated_files(first), generated_files(second))
        for file in generated_files(first):
            self.assertEqual((first / file).read_bytes(), (second / file).read_bytes(), str(file))
        refs = [data["profile"]["image"]] + [p["image"] for p in data["projects"]]
        refs += [image["path"] for p in data["projects"] for s in p["sections"] for image in s["images"]]
        for path in refs:
            self.assertTrue((first / "Resources" / path).is_file(), path)

    def test_paths_cannot_read_files_outside_site(self):
        page = self.root / "index.html"
        for raw in ["../private.png", "%2e%2e/private.png", "https://example.com/image.jpg", "//example.com/image.jpg", "data:image/png;base64,ABC", "assets\\secret.png", "assets/%00secret.png", "https://[broken"]:
            self.assertIsNone(local_path(self.root, page, raw), raw)
        outside = Path(self.temporary.name) / "private.png"
        outside.write_bytes(b"private")
        (self.root / "assets/escape.png").symlink_to(outside)
        self.assertIsNone(local_path(self.root, page, "assets/escape.png"))

    def test_unsafe_links_are_dropped_and_unicode_paths_are_encoded(self):
        for raw in ["javascript:alert(1)", "data:text/html,test", "mailto:other@example.com", "https://user:secret@example.com/", "../private.html", "#modal", "https://[broken"]:
            self.assertIsNone(public_url("https://portfolio.example/", "case.html", raw), raw)
        self.assertEqual(public_url("https://portfolio.example/", "case.html", "assets/Ü one.pdf"),
                         "https://portfolio.example/assets/%C3%9C%20one.pdf")

    def test_duplicate_project_identity_fails_instead_of_silently_overwriting(self):
        home = self.root / "index.html"
        home.write_text(home.read_text() + '<article class="portfolio-card" data-project="second"><h2>Duplicate</h2></article>')
        with self.assertRaisesRegex(ValueError, "uniquely identified"):
            generate(self.root, Path(self.temporary.name) / "out")


if __name__ == "__main__":
    unittest.main()
