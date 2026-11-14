"""Rebuild assets/pdf/bapeters_cv.pdf from index.html (Python + ReportLab + Pillow).

Dates, education, certificates, languages, skills and images come from the
homepage. The print copy and project order below keep the CV at three A4 pages.
Set CV_FONT_DIR to an Aptos font directory and CV_EMOJI_FONT to a color emoji font
if they are not installed in one of the standard locations below.
"""
from base64 import b64encode
from html import escape
from html.parser import HTMLParser
from io import BytesIO
from os import environ
from pathlib import Path
import re
import sys
from urllib.parse import urljoin

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
from reportlab import rl_config
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://bram-peters.com/'
OUTPUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'assets/pdf/bapeters_cv.pdf'


class Element:
    def __init__(self, tag='', attrs=(), parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children = []

    def text(self):
        return re.sub(r'\s+', ' ', ''.join(c.text() if isinstance(c, Element) else c for c in self.children)).strip()

    def all(self, cls=None, tag=None):
        result = []
        for child in self.children:
            if not isinstance(child, Element):
                continue
            if (cls is None or cls in child.attrs.get('class', '').split()) and (tag is None or tag == child.tag):
                result.append(child)
            result.extend(child.all(cls, tag))
        return result

    def one(self, cls=None, tag=None):
        return self.all(cls, tag)[0]


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.root = Element()
        self.stack = [self.root]
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        node = Element(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack[-1].tag == tag:
            self.stack.pop()

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


doc = Document((ROOT / 'index.html').read_text()).root
experience = [item for item in doc.all('experience-item')
              if not item.one('exp-title').text().startswith('Owner/Founder, Lost In Translation')]
projects = {item.attrs['data-project']: item for item in doc.all('portfolio-card')}
skills = doc.all('skill-glass-card')

intro = ("👋 Hi, I'm Bram! I'm a Business Intelligence Specialist at KLM with a background in UX/UI and an MSc in "
         "Human-Technology Interaction. I believe data should tell a story and good design shouldn't need an "
         "instruction manual. I turn messy data into tools people want to use. Let's make something that makes sense. 🚀")
experience_copy = {
    'Business Intelligence-Specialist, KLM': 'Delivering full-stack Microsoft Power Platform products for aviation Engineering & Maintenance, combining BI, user-centred design and stakeholder collaboration.',
    'Owner/Founder, Bram Peters Studio™': 'Independent design and development freelance venture for full-stack websites, apps, UX/UI, BI and Power Platforms solutions, alongside creative video production for businesses and individuals.',
    'Senior BI Advisor & Product Designer, UWV SMZ': 'Led BI products for Social-Medical Affairs: ETL pipelines, SQL/SSIS/SSAS, Oracle, external data integration and advanced DAX/Power BI reporting.',
    'Data Analyst & BI Specialist, UWV SMZ': 'Built and optimised data pipelines and analytics dashboards; translated business needs into models and integrated multiple agency data sources.',
    'Data/BI Specialist, SerenIT': 'Delivered dashboards and reporting for public and private clients; led KPI workshops and developed DAX measures and SQL queries.',
    'Master Thesis Project - TU/e Security Office': 'Designed and implemented a student dashboard for self-regulated learning, using user research, stakeholder requirements and Power BI prototypes.',
    'Frontend Developer, TU/e': 'Built modular React/Vue components integrated with Typo3, SharePoint and educational portals, supporting internal tools across teams.',
    'UX Designer & Android Developer, Blue Jay': 'Designed a healthcare drone interface and Android app, including UX research, iterative testing, voice recognition and mood-sensitive lighting.',
}
# Insertion order is the print order; descriptions fit the original card footprint.
project_copy = {
    'uwv-monitor': 'Made socio-medical data understandable through public insight into WIA assessments, diagnoses, outcomes and regional trends.',
    'mypremiereplus': 'Turns old family videos into a private streaming library with themed collections, family recommendations and TV-style channels.',
    'lost-in-translation': 'Built an AI-powered map-poster platform with custom travel assistants, personalised literal translations and brand-focused e-commerce.',
    'lelibrambas': 'Designed a private family-video streaming platform for TV, desktop and mobile, spanning UX/UI, cloud data, APIs and media delivery.',
    'tue-learning-dashboard': 'Mapped student journeys, set up ETL processes and designed academic-performance visualisations to support self-regulated learning.',
    'emotional-drone': 'Co-designed a healthcare drone interface and Android app, combining user research, voice recognition and mood-sensitive lighting.',
    'amstroll': 'Built an AI-assisted Amsterdam outing planner that tailors ideas to your mood, time and budget, including how to get there and back.',
    'doula': 'Redesigned a pregnancy and contraction tracker in a 10-hour UX/UI case study, using research and usability findings to guide the experience.',
    'vinobo': 'Built a video-learning tool with searchable YouTube transcripts, timestamped annotations and personal notebooks saved to user accounts.',
    'spotify': 'Applied the Double Diamond framework at KTH to research listener goals and redesign the Spotify podcast experience.',
    'raspberries': 'Co-designed Rodebjer\'s digital in-store shopping assistant, giving customers greater control over fitting rooms, service and their visit.',
    'j-meijer': 'Created "A Day in the Life of Luca Orvini", a playful company-anniversary film, exploring concept development, directing and post-production.',
    'next-project': 'Looking for new challenges that combine design and development. Let\'s connect and make something that makes sense.',
}
project_titles = {
    'mypremiereplus': 'MyPremiere+',
    'lost-in-translation': 'Lost In Translation™',
    'lelibrambas': 'LELIBRAMBAS+ | Family Archive Streaming',
    'amstroll': 'Amstroll',
    'next-project': 'My Next Project',
}
project_links = {
    'mypremiereplus': 'mypremiereplus.html',
    'lost-in-translation': 'index.html#project-lost-in-translation',
}
assert len(experience) == len(experience_copy), 'Review print summaries when experience changes.'
assert len(project_copy) == 13 and project_copy.keys() <= projects.keys()

font_files = {'CVBody': 'Aptos.ttf', 'CVTitle': 'Aptos-SemiBold.ttf',
              'CVHeading': 'Aptos-Bold.ttf', 'CVLight': 'Aptos-Light.ttf'}
font_dirs = [
    Path(environ['CV_FONT_DIR']) if environ.get('CV_FONT_DIR') else None,
    Path('/Applications/Microsoft Word.app/Contents/Resources/DFonts'),
    Path('/Applications/Microsoft PowerPoint.app/Contents/Resources/DFonts'),
    Path.home() / 'Library/Fonts',
    Path.home() / '.local/share/fonts/aptos',
    Path(environ.get('WINDIR', 'C:/Windows')) / 'Fonts',
]
font_dir = next((p for p in font_dirs if p and all((p / f).is_file() for f in font_files.values())), None)
if font_dir is None:
    sys.exit('Install the Aptos font family and set CV_FONT_DIR to its directory.')
for name, filename in font_files.items():
    pdfmetrics.registerFont(TTFont(name, str(font_dir / filename)))

W, H = A4
M = 32
INK = colors.HexColor('#283344')
MUTED = colors.HexColor('#526079')
BLUE = colors.HexColor('#426aa7')
LINE = colors.HexColor('#d1dbea')
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
rl_config.useA85 = 0
pdf = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
pdf.setTitle('Bram Peters - Curriculum Vitae')
pdf.setAuthor('Bram Peters')
pdf.setSubject('Experience, education, portfolio and capabilities from bram-peters.com')


def clean(value):
    return value.translate(str.maketrans({'–': '-', '—': '-', '→': 'to', '\u00a0': ' '}))


def emoji_image(char):
    paths = [
        Path(environ['CV_EMOJI_FONT']) if environ.get('CV_EMOJI_FONT') else None,
        Path('/System/Library/Fonts/Apple Color Emoji.ttc'),
        Path('/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf'),
        Path(environ.get('WINDIR', 'C:/Windows')) / 'Fonts/seguiemj.ttf',
    ]
    path = next((p for p in paths if p and p.is_file()), None)
    if path is None:
        sys.exit('Install a color emoji font and set CV_EMOJI_FONT to its path.')
    for size in (96, 109, 64):
        try:
            font = ImageFont.truetype(str(path), size)
            break
        except OSError:
            continue
    else:
        sys.exit(f'Could not load color emoji font: {path}')
    image = Image.new('RGBA', (size * 3, size * 3))
    ImageDraw.Draw(image).text((size // 2, size // 2), char, font=font, embedded_color=True)
    image = image.crop(image.getbbox())
    png = BytesIO()
    image.save(png, format='PNG')
    data = b64encode(png.getvalue()).decode('ascii')
    width = 9.1 * image.width / image.height
    return f'<img src="data:image/png;base64,{data}" width="{width:.2f}" height="9.1" valign="-1.6"/>'


def para(value, x, top, width, size=8.7, leading=None, font='CVBody', color=INK, emoji=False):
    style = ParagraphStyle('cv', fontName=font, fontSize=size,
                           leading=leading or size * 1.32, textColor=color)
    markup = escape(clean(value))
    if emoji:
        for char in ('👋', '🚀'):
            if char in markup:
                markup = markup.replace(char, emoji_image(char))
    p = Paragraph(markup, style)
    _, height = p.wrap(width, H)
    p.drawOn(pdf, x, top - height)
    assert top - height >= 37, f'Text exceeds page bounds: {value[:70]}'
    return height


def rule(x, y, width):
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(.65)
    pdf.line(x, y, x + width, y)


def card(x, top, width, height):
    pdf.setFillColor(colors.HexColor('#e0e7f1'))
    pdf.roundRect(x + 1.5, top - height - 3, width, height, 12, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor('#f8fafd'))
    pdf.setStrokeColor(colors.white)
    pdf.setLineWidth(.65)
    pdf.roundRect(x, top - height, width, height, 12, fill=1, stroke=1)


def heading(text, x, top, width):
    used = para(text.upper(), x, top, width, 10.3, font='CVHeading')
    rule(x, top - used - 5, width)
    return top - used - 14


def link(label, url, x, top, size=8.2):
    pdf.setFont('CVBody', size)
    pdf.setFillColor(BLUE)
    pdf.drawString(x, top - size, label)
    width = pdfmetrics.stringWidth(label, 'CVBody', size)
    pdf.setStrokeColor(BLUE)
    pdf.setLineWidth(.4)
    pdf.line(x, top - size - 1.4, x + width, top - size - 1.4)
    pdf.linkURL(url, (x, top - size - 2, x + width, top + 1), relative=0)


def project_button(url, mid_x, bottom):
    width, height = 95, 21
    x = mid_x - width / 2
    pdf.setFillColor(colors.HexColor('#d9e2ee'))
    pdf.roundRect(x, bottom - 1.3, width, height, 6, fill=1, stroke=0)
    pdf.saveState()
    shape = pdf.beginPath()
    shape.roundRect(x, bottom, width, height, 6)
    pdf.clipPath(shape, stroke=0)
    pdf.linearGradient(x, bottom + height, x, bottom,
                       ['#ffffff', '#eef3f9', '#dce5ef', '#eff4fa'],
                       positions=[0, .45, .76, 1], extend=True)
    pdf.restoreState()
    pdf.setStrokeColor(colors.HexColor('#b6c4d4'))
    pdf.setLineWidth(.65)
    pdf.roundRect(x, bottom, width, height, 6, fill=0, stroke=1)
    label, size = 'View Project', 8.3
    label_width = pdfmetrics.stringWidth(label, 'CVTitle', size)
    icon_x = mid_x - (label_width + 12) / 2
    icon_y = bottom + (height - 8) / 2
    pointer = pdf.beginPath()
    pointer.moveTo(icon_x + .6, icon_y + 8)
    for dx, dy in [(6.8, 3.2), (4.1, 2.9), (5.1, .65), (3.9, 0), (2.8, 2.45), (.6, .8)]:
        pointer.lineTo(icon_x + dx, icon_y + dy)
    pointer.close()
    pdf.setFillColor(colors.HexColor('#474e57'))
    pdf.drawPath(pointer, fill=1, stroke=0)
    pdf.setFont('CVTitle', size)
    pdf.drawString(icon_x + 12, bottom + (height - size) / 2 + 1.4, label)
    pdf.linkURL(url, (x, bottom, x + width, bottom + height), relative=0)


def employer_logo(path, x, top):
    with Image.open(ROOT / path) as source:
        image = source.convert('RGBA')
    image = image.crop(image.getbbox())
    image.thumbnail((92, 55), Image.Resampling.LANCZOS)
    width, height = image.width / 4, image.height / 4
    pdf.drawImage(ImageReader(image), x + (23 - width) / 2, top - 6.5 - height / 2,
                  width, height, mask='auto')


def language_flag(code, x, top):
    width, height, y = 15, 9, top - 10
    pdf.saveState()
    shape = pdf.beginPath()
    shape.roundRect(x, y, width, height, 1.8)
    pdf.clipPath(shape, stroke=0)

    def fill(hex_color, dx=0, dy=0, w=width, h=height):
        pdf.setFillColor(colors.HexColor(hex_color))
        pdf.rect(x + dx, y + dy, w, h, fill=1, stroke=0)

    if code == 'nl':
        fill('#FFFFFF')
        fill('#AE1C28', dy=6, h=3)
        fill('#21468B', h=3)
    elif code == 'se':
        fill('#006AA7')
        fill('#FECC00', dx=4.7, w=1.9)
        fill('#FECC00', dy=3.55, h=1.9)
    elif code == 'gb':
        fill('#012169')
        for stroke, line_width in [('#FFFFFF', 1.8), ('#C8102E', .7)]:
            pdf.setStrokeColor(colors.HexColor(stroke))
            pdf.setLineWidth(line_width)
            pdf.line(x, y, x + width, y + height)
            pdf.line(x, y + height, x + width, y)
        fill('#FFFFFF', dx=6, w=3)
        fill('#FFFFFF', dy=3, h=3)
        fill('#C8102E', dx=6.55, w=1.9)
        fill('#C8102E', dy=3.55, h=1.9)
    else:
        raise ValueError(f'Unknown language flag: {code}')
    pdf.restoreState()
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(.35)
    pdf.roundRect(x, y, width, height, 1.8, fill=0, stroke=1)


def picture(path, x, top, width, height, circle=False, show_full=False):
    with Image.open(ROOT / path) as source:
        img = source.convert('RGB')
    pixels = (round(width * 3), round(height * 3))
    thumb = ImageOps.fit(img, pixels, method=Image.Resampling.LANCZOS)
    if show_full:
        thumb = thumb.filter(ImageFilter.GaussianBlur(16))
        full = ImageOps.contain(img, pixels, method=Image.Resampling.LANCZOS)
        thumb.paste(full, ((pixels[0] - full.width) // 2, (pixels[1] - full.height) // 2))
    jpeg = BytesIO()
    thumb.save(jpeg, format='JPEG', quality=92, optimize=True)
    jpeg.seek(0)
    pdf.saveState()
    shape = pdf.beginPath()
    if circle:
        shape.circle(x + width / 2, top - height / 2, width / 2)
    else:
        shape.roundRect(x, top - height, width, height, 6)
    pdf.clipPath(shape, stroke=0)
    pdf.drawImage(ImageReader(jpeg), x, top - height, width, height)
    pdf.restoreState()


def page_base(number):
    pdf.setFillColor(colors.HexColor('#edf3fa'))
    pdf.rect(0, 0, W, H, fill=1, stroke=0)
    rule(M, 28, W - 2 * M)
    pdf.setFont('CVBody', 7)
    pdf.setFillColor(MUTED)
    pdf.drawRightString(W - M, 16, f'{number} / 3')
    pdf.drawString(M, 16, 'Bram Peters' if number == 1 else 'Bram Peters | Studio')


page_base(1)
picture('assets/img/Photo.png', M, H - M, 72, 72, circle=True)
pdf.setFillColor(colors.white)
pdf.setStrokeColor(colors.white)
pdf.setLineWidth(2)
pdf.circle(M + 36, H - M - 36, 36, stroke=1, fill=0)
x = M + 88
top = H - M - 2
pdf.setFont('CVHeading', 26)
pdf.setFillColor(colors.HexColor('#20242c'))
pdf.drawString(x, top - 24, 'Bram Peters')
para('Business Intelligence Specialist | Human-Centred Product Design', x, top - 37, W - M - x, 10, font='CVTitle')
para('MSc Human-Technology Interaction | UX/UI, data & digital products', x, top - 54, W - M - x, 8.7, color=MUTED)
rule(M, H - 116, W - 2 * M)

about_top, about_height = H - 128, 113
about_w, contact_x = 332, M + 344
contact_w = W - M - contact_x
card(M, about_top, about_w, about_height)
card(contact_x, about_top, contact_w, about_height)
y = heading('About me', M + 12, about_top - 12, about_w - 24)
assert y - para(intro, M + 12, y, about_w - 24, 9, emoji=True) >= about_top - about_height + 10
y = heading('Contact me', contact_x + 12, about_top - 12, contact_w - 24)
link('bramapeters@outlook.com', 'mailto:bramapeters@outlook.com', contact_x + 12, y, 8)
language_flag('nl', contact_x + 12, y - 12)
link('+31 6 30827054', 'tel:+31630827054', contact_x + 32, y - 12, 8)
para('Haarlemmerdijk 3, 1013JZ Amsterdam', contact_x + 12, y - 24, contact_w - 24, 8)
link('bram-peters.com', SITE, contact_x + 12, y - 36, 8)
link('LinkedIn: Bram Peters', 'https://www.linkedin.com/in/bram-peters/', contact_x + 12, y - 48, 8)
link('LinkedIn: Bram Peters Studio', 'https://www.linkedin.com/company/bram-peters-studio/', contact_x + 12, y - 60, 8)

section_top = about_top - about_height - 12
side_w, gutter = 160, 12
main_x, main_w = M + side_w + gutter, W - 2 * M - side_w - gutter
section_h = section_top - 43
card(M, section_top, side_w, section_h)
card(main_x, section_top, main_w, section_h)
y = section_top - 12
for name, container_class in [('Education', 'education-list'), ('Languages', 'language-list'), ('Certificates', 'certificates-grid')]:
    y = heading(name, M + 12, y, side_w - 24)
    for item in doc.one(container_class).all(tag='li'):
        title = item.one(tag='strong').text()
        spans = item.all(tag='span')
        detail = spans[-1].text()
        offset = 0
        if container_class == 'language-list':
            code = Path(item.one('language-flag').attrs['src']).stem
            language_flag(code, M + 12, y)
            offset = 20
        y -= para(title, M + 12 + offset, y, side_w - 24 - offset, 8.8, font='CVTitle') + 3
        y -= para(detail, M + 12, y, side_w - 24, 7.8, color=MUTED) + 7
    y -= 5

y = heading('Professional experience', main_x + 12, section_top - 12, main_w - 24)
for index, item in enumerate(experience):
    title = item.one('exp-title')
    parts = re.split(r' [–|] ', title.text())
    role, location = ' - '.join(parts[:-1]), parts[-1]
    if role == 'Freelancing, Bram Peters Studio™':
        role = 'Owner/Founder, Bram Peters Studio™'
    dates = item.one('experience-dates').text().replace('Okt ', 'Oct ')
    employer_logo(title.one(tag='img').attrs['src'], main_x + 12, y)
    y -= para(role, main_x + 40, y, main_w - 52, 9.4, font='CVTitle') + 2
    y -= para(f'{location} | {dates}', main_x + 12, y, main_w - 24, 7.5, color=MUTED) + 4
    y -= para(experience_copy[role], main_x + 12, y, main_w - 24, 8.6, leading=10.8) + 11
    if index != len(experience) - 1:
        rule(main_x + 12, y + 3, main_w - 24)
assert y >= 48, f'Experience content overflow ({y:.1f})'
pdf.showPage()


def portfolio_page(number, items, capabilities):
    page_base(number)
    para('BRAM PETERS | STUDIO', M, H - M, 330, 9, font='CVHeading')
    link('bram-peters.com', SITE, W - M - 72, H - M, 8)
    para('Selected work & capabilities', M, H - 69, W - 2 * M, 22, font='CVLight')
    top = H - 112
    left_w, right_w, gap = 353, W - 2 * M - 365, 12
    right_x = M + left_w + gap
    heading('Portfolio' if number == 2 else 'Portfolio continued', M, top, left_w)
    card(right_x, top + 1, right_w, top - 42)
    sy = heading('Skills' if number == 2 else 'Skills continued', right_x + 11, top - 11, right_w - 22)
    for item in capabilities:
        sy -= para(item.one('skill-title').text(), right_x + 11, sy, right_w - 22, 9.2, font='CVTitle') + 2
        sy -= para(item.one('skill-level').text(), right_x + 11, sy, right_w - 22, 7.5, color=BLUE) + 4
        sy -= para(item.one('skill-description').text(), right_x + 11, sy, right_w - 22, 7.6, leading=10.1, color=MUTED) + 14
    assert sy >= 47, f'Skills overflow ({sy:.1f})'
    col_w = (left_w - 12) / 2
    row_h = 211 if number == 2 else 187
    start = top - 28
    for i, project_id in enumerate(items[:6]):
        item = projects[project_id]
        px = M + (i % 2) * (col_w + 12)
        py = start - (i // 2) * (row_h + 12)
        card(px, py, col_w, row_h)
        image = item.one(tag='img').attrs['src']
        image_h = 70 if number == 2 else 60
        picture(image, px + 7, py - 7, col_w - 14, image_h, show_full=project_id == 'mypremiereplus')
        ty = py - image_h - 15
        title = project_titles.get(project_id) or item.one(tag='h2').text()
        ty -= para(title, px + 9, ty, col_w - 18, 9.5, leading=11.5, font='CVTitle') + 6
        ty -= para(project_copy[project_id], px + 9, ty, col_w - 18, 8.55, leading=10.9) + 8
        href = project_links.get(project_id) or item.one('portfolio-card-link').attrs['href']
        button_bottom = py - row_h + 10
        assert ty >= button_bottom + 21, f'Project card overflow: {project_id}'
        project_button(urljoin(SITE, href), px + col_w / 2, button_bottom)
    if len(items) > 6:
        assert items[6] == 'next-project'
        ty = start - 3 * (row_h + 12) + 1
        card(M, ty, left_w, 62)
        para(project_titles['next-project'], M + 11, ty - 9, left_w - 22, 10, font='CVTitle')
        para(project_copy['next-project'], M + 11, ty - 25, left_w - 22, 8.1)
        link('Contact me', urljoin(SITE, projects['next-project'].one('portfolio-card-link').attrs['href']),
             M + 11, ty - 46, 8)
        assert ty - 62 >= 40
    pdf.showPage()


print_order = list(project_copy)
portfolio_page(2, print_order[:6], skills[:5])
portfolio_page(3, print_order[6:], skills[5:])
pdf.save()
print(f'Created {OUTPUT} (3 A4 pages; {len(experience)} roles, {len(project_copy) - 1} projects, {len(skills)} skills).')
