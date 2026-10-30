"""Rebuild assets/pdf/bapeters_cv.pdf from index.html (Python + ReportLab + Pillow).

Titles, dates, education, certificates, languages, skills and portfolio images are
read from the homepage. The short print descriptions below keep the CV at three
A4 pages; update them alongside substantial homepage narrative changes.
"""
from html import escape
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
import re
import sys

from PIL import Image, ImageOps
import reportlab
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
experience = doc.all('experience-item')
projects = doc.all('portfolio-card')
skills = doc.all('skill-glass-card')

experience_copy = [
    'Delivering full-stack Microsoft Power Platform products for aviation Engineering & Maintenance, combining BI, user-centred design and stakeholder collaboration.',
    'Founded and built an AI-powered e-commerce platform for personalised transit-map posters, combining product design, branded storytelling and custom AI travel assistants.',
    'Independent design and development of websites, apps, UX/UI, BI and Power Platform solutions, alongside creative video production for businesses and individuals.',
    'Led BI products for Social-Medical Affairs: ETL pipelines, SQL/SSIS/SSAS, Oracle, external data integration and advanced DAX/Power BI reporting.',
    'Built and optimised data pipelines and analytics dashboards; translated business needs into models and integrated multiple agency data sources.',
    'Delivered dashboards and reporting for public and private clients; led KPI workshops and developed DAX measures and SQL queries.',
    'Designed and implemented a student dashboard for self-regulated learning, using user research, stakeholder requirements and Power BI prototypes.',
    'Built modular React/Vue components integrated with Typo3, SharePoint and educational portals, supporting internal tools across teams.',
    'Designed a healthcare drone interface and Android app, including UX research, iterative testing, voice recognition and mood-sensitive lighting.',
]
project_copy = {
    'uwv-monitor': 'Made socio-medical data understandable through public insight into WIA assessments, diagnoses, outcomes and regional trends.',
    'lost-in-translation': 'Built an AI-powered map-poster platform with custom travel assistants, personalised literal translations and brand-focused e-commerce.',
    'lelibrambas': 'Designed a private family-video streaming platform for TV, desktop and mobile, spanning UX/UI, cloud data, APIs and media delivery.',
    'tue-learning-dashboard': 'Mapped student journeys, set up ETL processes and designed academic-performance visualisations to support self-regulated learning.',
    'emotional-drone': 'Co-designed a healthcare drone interface and Android app, combining user research, voice recognition and mood-sensitive lighting.',
    'klm-powerplatform': 'Developing a full-stack M365 Power Platform solution for KLM Engineering & Maintenance, co-designed with stakeholders across the organisation.',
    'doula': 'Redesigned a pregnancy and contraction tracker in a 10-hour UX/UI case study, using research and usability findings to guide the experience.',
    'vinobo': 'Built a video-learning tool with searchable YouTube transcripts, timestamped annotations and personal notebooks saved to user accounts.',
    'spotify': 'Applied the Double Diamond framework at KTH to research listener goals and redesign the Spotify podcast experience.',
    'raspberries': 'Co-designed Rodebjer\'s digital in-store shopping assistant, giving customers greater control over fitting rooms, service and their visit.',
    'honeymoon': 'Built a personalised wedding-gift webshop for honeymoon activities and stays, with guest messages collected in a keepsake collage.',
    'j-meijer': 'Created "A Day in the Life of Luca Orvini", a playful company-anniversary film, exploring concept development, directing and post-production.',
    'next-project': 'Looking for new challenges that combine design and development. Let\'s connect and make something that makes sense.',
}
assert len(experience) == len(experience_copy), 'Review print summaries when experience changes.'
assert set(project_copy) == {p.attrs['data-project'] for p in projects}, 'Review print summaries when projects change.'

FONT_DIR = Path('/usr/share/fonts/truetype/dejavu')
body_font_dir = next(Path('/usr/share/fonts/truetype').glob('liberation*/LiberationSans-Regular.ttf'), None)
bundled_fonts = Path(reportlab.__file__).parent / 'fonts'
for name, filename, fallback in [('CVBody', 'LiberationSans-Regular.ttf', 'Vera.ttf'), ('CVBodyBold', 'LiberationSans-Bold.ttf', 'VeraBd.ttf')]:
    font = body_font_dir.parent / filename if body_font_dir else bundled_fonts / fallback
    pdfmetrics.registerFont(TTFont(name, str(font)))
if (FONT_DIR / 'DejaVuSans.ttf').exists():
    for name, file in [('CVName', 'DejaVuSans-Bold.ttf'), ('CVLight', 'DejaVuSans-ExtraLight.ttf')]:
        path = FONT_DIR / file
        pdfmetrics.registerFont(TTFont(name, str(path if path.exists() else FONT_DIR / 'DejaVuSans.ttf')))
else:
    # ReportLab's bundled fonts keep regeneration portable.
    pdfmetrics.registerFont(pdfmetrics.Font('CVName', 'Helvetica-Bold', 'WinAnsiEncoding'))
    pdfmetrics.registerFont(pdfmetrics.Font('CVLight', 'Helvetica', 'WinAnsiEncoding'))

W, H = A4
M = 32
INK = colors.HexColor('#283344')
MUTED = colors.HexColor('#526079')
BLUE = colors.HexColor('#426aa7')
LINE = colors.HexColor('#d1dbea')
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
rl_config.useA85 = 0
pdf = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
pdf.setTitle('Bram Peters | Studio - Curriculum Vitae')
pdf.setAuthor('Bram Peters')
pdf.setSubject('Experience, education, portfolio and capabilities from bram-peters.com')


def clean(value):
    return value.translate(str.maketrans({'–': '-', '—': '-', '→': 'to', '\u00a0': ' '}))


def para(value, x, top, width, size=8.7, leading=None, bold=False, color=INK):
    style = ParagraphStyle('cv', fontName='CVBodyBold' if bold else 'CVBody', fontSize=size,
                           leading=leading or size * 1.32, textColor=color)
    p = Paragraph(escape(clean(value)), style)
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
    used = para(text.upper(), x, top, width, 10.3, bold=True)
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


def picture(path, x, top, width, height, circle=False):
    img = Image.open(ROOT / path).convert('RGB')
    img = ImageOps.fit(img, (round(width * 3), round(height * 3)), method=Image.Resampling.LANCZOS)
    jpeg = BytesIO()
    img.save(jpeg, format='JPEG', quality=92, optimize=True)
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
    pdf.drawString(M, 16, 'Bram Peters | Studio')


page_base(1)
picture('assets/img/Photo.png', M, H - M, 72, 72, circle=True)
pdf.setFillColor(colors.white)
pdf.setStrokeColor(colors.white)
pdf.setLineWidth(2)
pdf.circle(M + 36, H - M - 36, 36, stroke=1, fill=0)
x = M + 88
top = H - M - 2
pdf.setFont('CVName', 24)
pdf.setFillColor(colors.HexColor('#20242c'))
pdf.drawString(x, top - 24, 'Bram Peters')
name_width = pdfmetrics.stringWidth('Bram Peters', 'CVName', 24)
pdf.setFont('CVLight', 24)
pdf.drawString(x + name_width + 9, top - 24, '| Studio')
para('Business Intelligence Specialist | Human-Centred Product Design', x, top - 37, W - M - x, 10)
para('MSc Human-Technology Interaction | UX/UI, data & digital products', x, top - 54, W - M - x, 8.7, color=MUTED)
rule(M, H - 116, W - 2 * M)

about_top, about_height = H - 128, 113
about_w, contact_x = 332, M + 344
contact_w = W - M - contact_x
card(M, about_top, about_w, about_height)
card(contact_x, about_top, contact_w, about_height)
y = heading('About me', M + 12, about_top - 12, about_w - 24)
para('Business Intelligence Specialist at KLM with an MSc in Human-Technology Interaction and a background in UX/UI. I turn complex data into intuitive products, connecting pipelines, user-centred design and complete digital solutions. Through Bram Peters Studio and Lost In Translation, I also build branded apps, websites and creative experiences.',
     M + 12, y, about_w - 24, 8.7)
y = heading('Contact me', contact_x + 12, about_top - 12, contact_w - 24)
link('bramapeters@outlook.com', 'mailto:bramapeters@outlook.com', contact_x + 12, y, 8)
para('Amsterdam, Netherlands', contact_x + 12, y - 15, contact_w - 24, 8)
link('bram-peters.com', SITE, contact_x + 12, y - 29, 8)
link('LinkedIn: Bram Peters', 'https://www.linkedin.com/in/bram-peters/', contact_x + 12, y - 43, 8)
link('LinkedIn: Bram Peters Studios', 'https://www.linkedin.com/company/bram-peters-studio/', contact_x + 12, y - 57, 8)

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
        y -= para(title, M + 12, y, side_w - 24, 8.6, bold=True) + 3
        y -= para(detail, M + 12, y, side_w - 24, 7.8, color=MUTED) + 7
    y -= 5

y = heading('Professional experience', main_x + 12, section_top - 12, main_w - 24)
for index, item in enumerate(experience):
    title = item.one('exp-title').text()
    parts = re.split(r' [–|] ', title)
    role, location = ' - '.join(parts[:-1]), parts[-1]
    dates = item.one('experience-dates').text().replace('Okt ', 'Oct ')
    y -= para(role, main_x + 12, y, main_w - 24, 9.1, bold=True) + 2
    y -= para(f'{location} | {dates}', main_x + 12, y, main_w - 24, 7.5, color=MUTED) + 4
    y -= para(experience_copy[index], main_x + 12, y, main_w - 24, 8.25, leading=10.2) + 7
    if index != len(experience) - 1:
        rule(main_x + 12, y + 3, main_w - 24)
assert y >= 48, f'Experience content overflow ({y:.1f})'
pdf.showPage()


def portfolio_page(number, items, capabilities):
    page_base(number)
    para('BRAM PETERS | STUDIO', M, H - M, 330, 9, bold=True)
    link('bram-peters.com', SITE, W - M - 72, H - M, 8)
    para('Selected work & capabilities', M, H - 69, W - 2 * M, 21)
    top = H - 112
    left_w, right_w, gap = 353, W - 2 * M - 365, 12
    right_x = M + left_w + gap
    heading('Portfolio' if number == 2 else 'Portfolio continued', M, top, left_w)
    card(right_x, top + 1, right_w, top - 42)
    sy = heading('Skills' if number == 2 else 'Skills continued', right_x + 11, top - 11, right_w - 22)
    for item in capabilities:
        sy -= para(item.one('skill-title').text(), right_x + 11, sy, right_w - 22, 9.0, bold=True) + 2
        sy -= para(item.one('skill-level').text(), right_x + 11, sy, right_w - 22, 7.5, color=BLUE) + 4
        sy -= para(item.one('skill-description').text(), right_x + 11, sy, right_w - 22, 7.6, leading=10.1, color=MUTED) + 14
    assert sy >= 47, f'Skills overflow ({sy:.1f})'
    col_w = (left_w - 12) / 2
    row_h = 211 if number == 2 else 187
    start = top - 28
    for i, item in enumerate(items[:6]):
        px = M + (i % 2) * (col_w + 12)
        py = start - (i // 2) * (row_h + 12)
        card(px, py, col_w, row_h)
        image = item.one(tag='img').attrs['src']
        image_h = 70 if number == 2 else 60
        picture(image, px + 7, py - 7, col_w - 14, image_h)
        ty = py - image_h - 15
        ty -= para(item.one(tag='h2').text(), px + 9, ty, col_w - 18, 9.1, leading=11.5, bold=True) + 6
        project_id = item.attrs['data-project']
        ty -= para(project_copy[project_id], px + 9, ty, col_w - 18, 8.2, leading=10.7) + 8
        anchors = item.all(tag='a')
        href = anchors[0].attrs['href'] if anchors else SITE + 'index.html#project-' + project_id
        if not re.match(r'^(https?:|mailto:)', href):
            href = SITE + href
        if project_id == 'klm-powerplatform':
            label = 'Coming soon - view overview'
        elif href.startswith('mailto:'):
            label = 'Contact me'
        else:
            label = 'View project'
        # Keep the link in a consistent position at the bottom of each card.
        link_top = py - row_h + 19
        assert ty >= link_top, f'Project card overflow: {project_id} ({ty:.1f}, {link_top:.1f})'
        link(label, href, px + 9, link_top, 7.8)
    if len(items) > 6:
        item = items[6]
        ty = start - 3 * (row_h + 12) + 1
        card(M, ty, left_w, 62)
        para(item.one(tag='h2').text(), M + 11, ty - 9, left_w - 22, 10, bold=True)
        para(project_copy['next-project'], M + 11, ty - 25, left_w - 22, 8.1)
        link('Contact me', 'mailto:bramapeters@outlook.com', M + 11, ty - 46, 8)
        assert ty - 62 >= 40
    pdf.showPage()


# Preserve the homepage's project order and current capability names and levels.
portfolio_page(2, projects[:6], skills[:5])
portfolio_page(3, projects[6:], skills[5:])
pdf.save()
print(f'Created {OUTPUT} (3 A4 pages; {len(experience)} roles, {len(projects)} projects, {len(skills)} skills).')
