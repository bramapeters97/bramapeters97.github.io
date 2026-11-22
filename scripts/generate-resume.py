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
from reportlab.graphics import renderPDF
from reportlab.graphics.shapes import Drawing, Group
from reportlab.graphics.svgpath import SvgPath
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
EMAIL = 'bramapeters@outlook.com'
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

intro = (
    "👋 Hi, I'm <b>Bram</b>! A Business Intelligence Specialist at ✈️ "
    '<b><font color="#0099D9">KLM</font></b>, with a background in UX/UI design and an MSc in Human-Technology '
    "Interaction. A curious mind, a soft spot for good UX, and a healthy intolerance for unnecessary complexity."
    "<br/><br/>"
    "I believe data should tell a story, technology should make life easier, and good design shouldn't require an "
    "instruction manual. This belief has shaped the trajectory of my career in which my experience in BI and data "
    "analytics and passion for Human-Centred Design culminated in projects I still take a lot of pride in to this "
    "day. From untangling messy datasets and building data pipelines to designing intuitive interfaces and "
    "developing complete digital solutions, I enjoy turning complex challenges into products that people <i>want</i> "
    "to use. <b>Let's make something that makes sense.</b> 🚀"
)
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
    'lost-in-translation': 'Built an AI-powered map-poster platform with custom travel assistants, personalised literal translations and brand-focused e-commerce.',
    'mypremiereplus': 'Turns old family videos into a private streaming library with themed collections, family recommendations and TV-style channels.',
    'uwv-monitor': 'Made socio-medical data understandable through public insight into WIA assessments, diagnoses, outcomes and regional trends.',
    'lelibrambas': 'Designed a private family-video streaming platform for TV, desktop and mobile, spanning UX/UI, cloud data, APIs and media delivery.',
    'tue-learning-dashboard': 'Mapped student journeys, set up ETL processes and designed academic-performance visualisations to support self-regulated learning.',
    'emotional-drone': 'Co-designed a healthcare drone interface and Android app, combining user research, voice recognition and mood-sensitive lighting.',
    'amstroll': 'Built an AI-assisted Amsterdam outing planner that tailors ideas to your mood, time and budget, including how to get there and back.',
    'doula': 'Redesigned a pregnancy and contraction tracker in a 10-hour UX/UI case study, using research and usability findings to guide the experience.',
    'vinobo': 'Built a video-learning tool with searchable YouTube transcripts, timestamped annotations and personal notebooks saved to user accounts.',
    'spotify': 'Applied the Double Diamond framework at KTH to research listener goals and redesign the Spotify podcast experience.',
    'raspberries': 'Co-designed Rodebjer\'s digital in-store shopping assistant, giving customers greater control over fitting rooms, service and their visit.',
    'honeymoon': 'Built a personalised wedding-gift webshop for honeymoon activities and stays, with guest messages collected in a keepsake collage.',
    'j-meijer': 'Created "A Day in the Life of Luca Orvini", a playful company-anniversary film, exploring concept development, directing and post-production.',
    'next-project': 'Need a website, a fresh design, or a custom digital solution? I combine design and development to bring your ideas to life.',
}
project_titles = {
    'mypremiereplus': 'MyPremiere+',
    'lost-in-translation': 'Lost In Translation™',
    'lelibrambas': 'LELIBRAMBAS+ | Family Archive Streaming',
    'amstroll': 'Amstroll',
    'next-project': 'Let’s build something together!',
}
project_links = {
    'mypremiereplus': 'mypremiereplus.html',
    'lost-in-translation': 'index.html#project-lost-in-translation',
    'next-project': f'mailto:{EMAIL}',
}
assert len(experience) == len(experience_copy), 'Review print summaries when experience changes.'
assert len(project_copy) == 14 and project_copy.keys() <= projects.keys()

font_files = {'CVBody': 'Aptos.ttf', 'CVTitle': 'Aptos-SemiBold.ttf',
              'CVHeading': 'Aptos-Bold.ttf', 'CVLight': 'Aptos-Light.ttf',
              'CVItalic': 'Aptos-Italic.ttf', 'CVBoldItalic': 'Aptos-Bold-Italic.ttf'}
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
pdfmetrics.registerFontFamily('CVBody', normal='CVBody', bold='CVHeading',
                              italic='CVItalic', boldItalic='CVBoldItalic')

# Font Awesome Free 6.4.0 icons by Fonticons, Inc. (CC BY 4.0).
# Source: https://github.com/FortAwesome/Font-Awesome/tree/6.4.0/svgs
# License: https://creativecommons.org/licenses/by/4.0/
# Original paths, scaled and colored in icon() to match the homepage.
ICONS = {
    'user': (448, 512, 'M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z'),
    'briefcase': (512, 512, 'M184 48H328c4.4 0 8 3.6 8 8V96H176V56c0-4.4 3.6-8 8-8zm-56 8V96H64C28.7 96 0 124.7 0 160v96H192 320 512V160c0-35.3-28.7-64-64-64H384V56c0-30.9-25.1-56-56-56H184c-30.9 0-56 25.1-56 56zM512 288H320v32c0 17.7-14.3 32-32 32H224c-17.7 0-32-14.3-32-32V288H0V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V288z'),
    'graduation-cap': (640, 512, 'M320 32c-8.1 0-16.1 1.4-23.7 4.1L15.8 137.4C6.3 140.9 0 149.9 0 160s6.3 19.1 15.8 22.6l57.9 20.9C57.3 229.3 48 259.8 48 291.9v28.1c0 28.4-10.8 57.7-22.3 80.8c-6.5 13-13.9 25.8-22.5 37.6C0 442.7-.9 448.3 .9 453.4s6 8.9 11.2 10.2l64 16c4.2 1.1 8.7 .3 12.4-2s6.3-6.1 7.1-10.4c8.6-42.8 4.3-81.2-2.1-108.7C90.3 344.3 86 329.8 80 316.5V291.9c0-30.2 10.2-58.7 27.9-81.5c12.9-15.5 29.6-28 49.2-35.7l157-61.7c8.2-3.2 17.5 .8 20.7 9s-.8 17.5-9 20.7l-157 61.7c-12.4 4.9-23.3 12.4-32.2 21.6l159.6 57.6c7.6 2.7 15.6 4.1 23.7 4.1s16.1-1.4 23.7-4.1L624.2 182.6c9.5-3.4 15.8-12.5 15.8-22.6s-6.3-19.1-15.8-22.6L343.7 36.1C336.1 33.4 328.1 32 320 32zM128 408c0 35.3 86 72 192 72s192-36.7 192-72L496.7 262.6 354.5 314c-11.1 4-22.8 6-34.5 6s-23.5-2-34.5-6L143.3 262.6 128 408z'),
    'code': (640, 512, 'M392.8 1.2c-17-4.9-34.7 5-39.6 22l-128 448c-4.9 17 5 34.7 22 39.6s34.7-5 39.6-22l128-448c4.9-17-5-34.7-22-39.6zm80.6 120.1c-12.5 12.5-12.5 32.8 0 45.3L562.7 256l-89.4 89.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l112-112c12.5-12.5 12.5-32.8 0-45.3l-112-112c-12.5-12.5-32.8-12.5-45.3 0zm-306.7 0c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3l112 112c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256l89.4-89.4c12.5-12.5 12.5-32.8 0-45.3z'),
    'book': (448, 512, 'M96 0C43 0 0 43 0 96V416c0 53 43 96 96 96H384h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V384c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H384 96zm0 384H352v64H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zm32-240c0-8.8 7.2-16 16-16H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16zm16 48H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16s7.2-16 16-16z'),
    'language': (640, 512, 'M0 128C0 92.7 28.7 64 64 64H256h48 16H576c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H320 304 256 64c-35.3 0-64-28.7-64-64V128zm320 0V384H576V128H320zM178.3 175.9c-3.2-7.2-10.4-11.9-18.3-11.9s-15.1 4.7-18.3 11.9l-64 144c-4.5 10.1 .1 21.9 10.2 26.4s21.9-.1 26.4-10.2l8.9-20.1h73.6l8.9 20.1c4.5 10.1 16.3 14.6 26.4 10.2s14.6-16.3 10.2-26.4l-64-144zM160 233.2L179 276H141l19-42.8zM448 164c11 0 20 9 20 20v4h44 16c11 0 20 9 20 20s-9 20-20 20h-2l-1.6 4.5c-8.9 24.4-22.4 46.6-39.6 65.4c.9 .6 1.8 1.1 2.7 1.6l18.9 11.3c9.5 5.7 12.5 18 6.9 27.4s-18 12.5-27.4 6.9l-18.9-11.3c-4.5-2.7-8.8-5.5-13.1-8.5c-10.6 7.5-21.9 14-34 19.4l-3.6 1.6c-10.1 4.5-21.9-.1-26.4-10.2s.1-21.9 10.2-26.4l3.6-1.6c6.4-2.9 12.6-6.1 18.5-9.8l-12.2-12.2c-7.8-7.8-7.8-20.5 0-28.3s20.5-7.8 28.3 0l14.6 14.6 .5 .5c12.4-13.1 22.5-28.3 29.8-45H448 376c-11 0-20-9-20-20s9-20 20-20h52v-4c0-11 9-20 20-20z'),
    'address-book': (512, 512, 'M96 0C60.7 0 32 28.7 32 64V448c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H96zM208 288h64c44.2 0 80 35.8 80 80c0 8.8-7.2 16-16 16H144c-8.8 0-16-7.2-16-16c0-44.2 35.8-80 80-80zm-32-96a64 64 0 1 1 128 0 64 64 0 1 1 -128 0zM512 80c0-8.8-7.2-16-16-16s-16 7.2-16 16v64c0 8.8 7.2 16 16 16s16-7.2 16-16V80zM496 192c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm16 144c0-8.8-7.2-16-16-16s-16 7.2-16 16v64c0 8.8 7.2 16 16 16s16-7.2 16-16V336z'),
    'layer-group': (576, 512, 'M264.5 5.2c14.9-6.9 32.1-6.9 47 0l218.6 101c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 149.8C37.4 145.8 32 137.3 32 128s5.4-17.9 13.9-21.8L264.5 5.2zM476.9 209.6l53.2 24.6c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 277.8C37.4 273.8 32 265.3 32 256s5.4-17.9 13.9-21.8l53.2-24.6 152 70.2c23.4 10.8 50.4 10.8 73.8 0l152-70.2zm-152 198.2l152-70.2 53.2 24.6c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 405.8C37.4 401.8 32 393.3 32 384s5.4-17.9 13.9-21.8l53.2-24.6 152 70.2c23.4 10.8 50.4 10.8 73.8 0z'),
    'envelope': (512, 512, 'M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z'),
    'phone': (512, 512, 'M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z'),
    'location-dot': (384, 512, 'M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z'),
    'globe': (512, 512, 'M352 256c0 22.2-1.2 43.6-3.3 64H163.3c-2.2-20.4-3.3-41.8-3.3-64s1.2-43.6 3.3-64H348.7c2.2 20.4 3.3 41.8 3.3 64zm28.8-64H503.9c5.3 20.5 8.1 41.9 8.1 64s-2.8 43.5-8.1 64H380.8c2.1-20.6 3.2-42 3.2-64s-1.1-43.4-3.2-64zm112.6-32H376.7c-10-63.9-29.8-117.4-55.3-151.6c78.3 20.7 142 77.5 171.9 151.6zm-149.1 0H167.7c6.1-36.4 15.5-68.6 27-94.7c10.5-23.6 22.2-40.7 33.5-51.5C239.4 3.2 248.7 0 256 0s16.6 3.2 27.8 13.8c11.3 10.8 23 27.9 33.5 51.5c11.6 26 20.9 58.2 27 94.7zm-209 0H18.6C48.6 85.9 112.2 29.1 190.6 8.4C165.1 42.6 145.3 96.1 135.3 160zM8.1 192H131.2c-2.1 20.6-3.2 42-3.2 64s1.1 43.4 3.2 64H8.1C2.8 299.5 0 278.1 0 256s2.8-43.5 8.1-64zM194.7 446.6c-11.6-26-20.9-58.2-27-94.6H344.3c-6.1 36.4-15.5 68.6-27 94.6c-10.5 23.6-22.2 40.7-33.5 51.5C272.6 508.8 263.3 512 256 512s-16.6-3.2-27.8-13.8c-11.3-10.8-23-27.9-33.5-51.5zM135.3 352c10 63.9 29.8 117.4 55.3 151.6C112.2 482.9 48.6 426.1 18.6 352H135.3zm358.1 0c-30 74.1-93.6 130.9-171.9 151.6c25.5-34.2 45.2-87.7 55.3-151.6H493.4z'),
    'linkedin': (448, 512, 'M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z'),
}
SECTION_ICONS = {
    'About me': 'user', 'Contact me': 'address-book', 'Education': 'graduation-cap',
    'Languages': 'language', 'Certificates': 'book', 'Professional experience': 'briefcase',
    'Portfolio': 'layer-group', 'Portfolio continued': 'layer-group',
    'Skills': 'code', 'Skills continued': 'code',
}

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


def para(value, x, top, width, size=8.7, leading=None, font='CVBody', color=INK, emoji=False, rich=False):
    style = ParagraphStyle('cv', fontName=font, fontSize=size,
                           leading=leading or size * 1.32, textColor=color)
    markup = value if rich else escape(clean(value))
    if emoji:
        for char in ('👋', '🚀', '🧩', '✈️'):
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


def icon(name, x, top, size):
    width, height, path = ICONS[name]
    scale = size / max(width, height)
    holder = Group(SvgPath(path, fillColor=colors.HexColor('#444444'), strokeColor=None))
    holder.translate((size - width * scale) / 2, (size + height * scale) / 2)
    holder.scale(scale, -scale)
    drawing = Drawing(size, size, holder)
    renderPDF.draw(drawing, pdf, x, top - size)


def heading(text, x, top, width):
    icon(SECTION_ICONS[text], x, top - 2, 10)
    used = para(text.upper(), x + 15, top, width - 15, 10.3, font='CVHeading')
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


BUTTON_HEIGHT = 20


def project_button(url, mid_x, bottom, label='View Project'):
    label_size = 8.6
    label_width = pdfmetrics.stringWidth(label, 'CVTitle', label_size)
    width, height = label_width + 37, BUTTON_HEIGHT
    x = mid_x - width / 2
    pdf.saveState()
    pdf.setFillColor(colors.HexColor('#436487'))
    pdf.setFillAlpha(.10)
    pdf.roundRect(x, bottom - .8, width, height, height / 2, fill=1, stroke=0)
    pdf.restoreState()

    pdf.saveState()
    shape = pdf.beginPath()
    shape.roundRect(x, bottom, width, height, height / 2)
    pdf.clipPath(shape, stroke=0)
    pdf.setFillAlpha(.78)
    pdf.linearGradient(x + width * .25, bottom + height, x + width * .55, bottom,
                       ['#ffffff', '#f3f9ff', '#d9eafa'],
                       positions=[0, .43, 1], extend=True)
    pdf.restoreState()

    pdf.saveState()
    pdf.setStrokeColor(colors.HexColor('#9eb4cc'))
    pdf.setStrokeAlpha(.44)
    pdf.setLineWidth(.5)
    pdf.roundRect(x, bottom, width, height, height / 2, fill=0, stroke=1)
    pdf.setStrokeColor(colors.white)
    pdf.setStrokeAlpha(.92)
    pdf.setLineWidth(.65)
    highlight = pdf.beginPath()
    highlight.moveTo(x + 4, bottom + height - 4)
    highlight.curveTo(x + 5.5, bottom + height - 1.5, x + 8, bottom + height - .8, x + 12, bottom + height - .8)
    highlight.lineTo(x + width - 12, bottom + height - .8)
    highlight.curveTo(x + width - 8, bottom + height - .8, x + width - 5.5, bottom + height - 1.5, x + width - 4, bottom + height - 4)
    pdf.drawPath(highlight)
    pdf.restoreState()

    icon_x = mid_x - (label_width + 12) / 2
    icon_y = bottom + (height - 8) / 2
    if label == 'Contact Me':
        icon('envelope', icon_x, icon_y + 8, 7.5)
    else:
        pointer = pdf.beginPath()
        pointer.moveTo(icon_x + .8, icon_y + 7.5)
        for dx, dy in [(6.4, 3.5), (4.0, 3.0), (4.9, 1.1), (3.8, .6), (2.8, 2.6), (.8, 1.2)]:
            pointer.lineTo(icon_x + dx, icon_y + dy)
        pointer.close()
        pdf.setFillColor(colors.HexColor('#474e57'))
        pdf.drawPath(pointer, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor('#474e57'))
    pdf.setFont('CVTitle', label_size)
    pdf.drawString(icon_x + 12, bottom + (height - label_size) / 2 + 1.4, label)
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


def picture(path, x, top, width, height, circle=False, show_full=False, badge=False):
    pixels = (round(width * 3), round(height * 3))
    with Image.open(ROOT / path) as source:
        img = source.convert('RGBA' if badge else 'RGB')
    if badge:
        thumb = Image.new('RGB', pixels, '#e9e9e9')
        mark_size = round(pixels[1] * .65)
        mark = ImageOps.contain(img, (mark_size, mark_size), method=Image.Resampling.LANCZOS)
        thumb.paste(mark, ((pixels[0] - mark.width) // 2, (pixels[1] - mark.height) // 2), mark)
    else:
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
para('🧩 I make sense of data, and data make sense.', x, top - 54, W - M - x, 9.5, font='CVLight', emoji=True)
rule(M, H - 112, W - 2 * M)

about_top, about_height = H - 123, 174
about_w, contact_x = 345, M + 357
contact_w = W - M - contact_x
card(M, about_top, about_w, about_height)
card(contact_x, about_top, contact_w, about_height)
y = heading('About me', M + 12, about_top - 12, about_w - 24)
intro_height = para(intro, M + 12, y, about_w - 24, 8.85, leading=10.25, emoji=True, rich=True)
assert y - intro_height >= about_top - about_height + 10, f'Introduction overflow ({intro_height:.1f} pt)'
y = heading('Contact me', contact_x + 12, about_top - 12, contact_w - 24)
contact_rows = [
    ('envelope', EMAIL, f'mailto:{EMAIL}'),
    ('envelope', 'info@bram-peters.com', 'mailto:info@bram-peters.com'),
    ('phone', '+31 6 30827054', 'tel:+31630827054'),
    ('location-dot', 'Haarlemmerdijk 3, 1013JZ Amsterdam', None),
    ('globe', 'bram-peters.com', SITE),
    ('linkedin', 'LinkedIn: Bram Peters', 'https://www.linkedin.com/in/bram-peters/'),
    ('linkedin', 'LinkedIn: Bram Peters Studio', 'https://www.linkedin.com/company/bram-peters-studio/'),
]
for index, (name, label, url) in enumerate(contact_rows):
    row_top = y - 17.5 * index
    icon(name, contact_x + 12, row_top - .45, 8.4)
    text_x = contact_x + 26
    if name == 'phone':
        language_flag('nl', text_x, row_top + .4)
        text_x += 20
    if url:
        link(label, url, text_x, row_top, 8.5)
    else:
        available = contact_x + contact_w - 12 - text_x
        size = min(8.5, 8.5 * (available - .5) / pdfmetrics.stringWidth(label, 'CVBody', 8.5))
        assert para(label, text_x, row_top, available, size, leading=11) == 11
assert row_top - 11 >= about_top - about_height + 10

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
        y -= para(title, M + 12 + offset, y, side_w - 24 - offset, 8.8, leading=10.7, font='CVTitle') + 2
        y -= para(detail, M + 12, y, side_w - 24, 7.8, leading=9.3, color=MUTED) + 5
    y -= 4
assert y >= 48, f'Sidebar content overflow ({y:.1f})'

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
    y -= para(f'{location} | {dates}', main_x + 12, y, main_w - 24, 7.5, color=MUTED) + 3
    y -= para(experience_copy[role], main_x + 12, y, main_w - 24, 8.6, leading=10.2) + 5.5
    if index != len(experience) - 1:
        rule(main_x + 12, y + 3, main_w - 24)
assert y >= 48, f'Experience content overflow ({y:.1f})'
pdf.showPage()


def portfolio_page(number, items, capabilities):
    page_base(number)
    header = pdf.beginText(M, H - M - 9)
    header.setFillColor(INK)
    header.setFont('CVHeading', 9)
    header.textOut('BRAM PETERS | ')
    header.setFont('CVLight', 9)
    header.textOut('STUDIO')
    pdf.drawText(header)
    link('bram-peters.com', SITE, W - M - 72, H - M, 8)
    top = H - 83
    start = top - 28
    left_w, gap = 353, 12
    right_w = W - 2 * M - left_w - gap
    right_x = M + left_w + gap
    heading('Portfolio' if number == 2 else 'Portfolio continued', M, top, left_w)
    heading('Skills' if number == 2 else 'Skills continued', right_x, top, right_w)
    skill_top = start
    skill_padding = 10
    skill_x = right_x + skill_padding
    skill_w = right_w - 2 * skill_padding
    for item in capabilities:
        title = item.one('skill-title').text()
        text_top = skill_top - skill_padding
        text_top -= para(title, skill_x, text_top, skill_w, 9.3, font='CVTitle') + 2
        text_top -= para(item.one('skill-level').text(), skill_x, text_top, skill_w, 7.6, color=BLUE) + 4
        text_top -= para(item.one('skill-description').text(), skill_x, text_top, skill_w,
                         8, leading=10.4, color=MUTED)
        skill_bottom = text_top - skill_padding
        assert skill_bottom >= 42, f'Skill card overflow: {title} ({skill_bottom:.1f} pt)'
        pdf.setStrokeColor(colors.HexColor('#bfc6cf'))
        pdf.setLineWidth(.6)
        pdf.roundRect(right_x, skill_bottom, right_w, skill_top - skill_bottom, 10, fill=0, stroke=1)
        skill_top = skill_bottom - 9
    col_w = (left_w - 12) / 2
    row_h, image_h, row_gap = 164, 54, 10
    assert len(items) <= 8
    for i, project_id in enumerate(items):
        item = projects[project_id]
        px = M + (i % 2) * (col_w + 12)
        py = start - (i // 2) * (row_h + row_gap)
        card(px, py, col_w, row_h)
        image = item.one(tag='img').attrs['src']
        picture(image, px + 7, py - 7, col_w - 14, image_h,
                show_full=project_id == 'mypremiereplus',
                badge=project_id == 'next-project')
        ty = py - image_h - 13
        title = project_titles.get(project_id) or item.one(tag='h2').text()
        ty -= para(title, px + 9, ty, col_w - 18, 9.5, leading=11, font='CVTitle') + 4
        ty -= para(project_copy[project_id], px + 9, ty, col_w - 18, 8.55, leading=10) + 7
        links = item.all('portfolio-card-link', tag='a')
        href = project_links.get(project_id) or (links[0].attrs.get('href') if links else None)
        content_bottom = ty - BUTTON_HEIGHT if href else ty
        assert py - row_h >= 42 and content_bottom >= py - row_h + 4, f'Project card overflow: {project_id}'
        if href:
            label = 'Contact Me' if project_id == 'next-project' else 'View Project'
            project_button(urljoin(SITE, href), px + col_w / 2, content_bottom, label)
    pdf.showPage()


print_order = list(project_copy)
portfolio_page(2, print_order[:8], skills[:5])
portfolio_page(3, print_order[8:], skills[5:])
pdf.save()
print(f'Created {OUTPUT} (3 A4 pages; {len(experience)} roles, {len(project_copy)} cards, {len(skills)} skills).')
