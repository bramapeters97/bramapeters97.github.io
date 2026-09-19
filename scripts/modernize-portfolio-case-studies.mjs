import fs from "node:fs";

const files = [
  "doulauxuicasestudy.html",
  "jmeijerbv40jaareendaginhetlevenvanlucaorvini.html",
  "raspberriesshoppingassistant.html",
  "reimaginingspotifypodcasts.html",
  "theemotionaldrone.html",
  "tuelearningdashboard.html",
  "uwvmonitorarbeidgezondheid.html",
  "vinobo.html",
];

function iconFor(title) {
  const value = title.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

  if (/skills? used/.test(value)) return "fa-solid fa-shapes";
  if (/links?/.test(value)) return "fa-solid fa-arrow-up-right-from-square";
  if (/video|demo|director/.test(value)) return "fa-solid fa-circle-play";
  if (/screenshot|home page|medical assessments|tour|meet blue jay|app$/.test(value)) return "fa-solid fa-image";
  if (/research|interview|think-aloud|affinity|usability|competitor/.test(value)) return "fa-solid fa-magnifying-glass-chart";
  if (/framework|design process|double diamond|visual style|interaction design/.test(value)) return "fa-solid fa-pen-ruler";
  if (/programming|technical|privacy|security|development/.test(value)) return "fa-solid fa-code";
  if (/learning|student|education/.test(value)) return "fa-solid fa-graduation-cap";
  if (/dashboard|monitor|data|bi /.test(value)) return "fa-solid fa-chart-line";
  if (/original|scrutiny|distrust|illness|challenge/.test(value)) return "fa-solid fa-triangle-exclamation";
  if (/final|result|outcome|impact|right tool/.test(value)) return "fa-solid fa-flag-checkered";
  if (/drone|health-care assistant/.test(value)) return "fa-solid fa-robot";
  if (/prototype|product|revamped|shopping|webtool|vinobo|doula/.test(value)) return "fa-solid fa-wand-magic-sparkles";
  return "fa-solid fa-lightbulb";
}

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");

  if (!html.includes("assets/css/case-study.css")) {
    html = html.replace(
      /(<link rel="stylesheet" href="assets\/css\/portfolio\.css"\s*\/?>)/,
      `$1\n    <link rel="stylesheet" href="assets/css/case-study.css" />`,
    );
  }

  html = html.replace(/<body(?:\s+class="[^"]*")?\s*>/, '<body class="portfolio-case">');

  if (!html.includes('class="case-skip"')) {
    html = html.replace(
      '<body class="portfolio-case">',
      '<body class="portfolio-case">\n    <a class="case-skip" href="#case-content">Skip to case study</a>',
    );
  }

  html = html.replace(
    /<section class="project-header" role="banner">([\s\S]*?)<\/section>\s*(?=<!-- MAIN CONTENT -->)/,
    '<header class="project-header">$1</header>\n\n        ',
  );

  html = html.replace(
    /<div class="section-title icon-title projects">\s*Portfolio Highlight\s*<\/div>/,
    '<span class="case-eyebrow"><i class="fa-solid fa-star" aria-hidden="true"></i> Portfolio highlight</span>',
  );

  html = html.replace(
    /<main class="page-two-columns" role="main">/,
    '<main class="page-two-columns" id="case-content">',
  );

  html = html.replace(
    /<aside class="card" aria-label="Skills used">/g,
    '<aside class="card case-meta" aria-label="Project overview and skills">',
  );

  html = html.replace(/<article class="card" style="margin-top:\s*25px">/g, '<article class="card">');

  html = html.replace(
    /<div class="section-title icon-title ([^"]+)">([\s\S]*?)<\/div>/g,
    (_match, _kind, title) => {
      const cleaned = title.trim();
      return `<h2 class="case-section-heading"><i class="${iconFor(cleaned)}" aria-hidden="true"></i><span>${cleaned}</span></h2>`;
    },
  );

  const leftColumn = html.indexOf('<section class="left-col"');
  if (leftColumn !== -1 && !html.includes('class="placeholder-muted case-lead"')) {
    const firstParagraph = html.indexOf('<p class="placeholder-muted">', leftColumn);
    if (firstParagraph !== -1) {
      html = `${html.slice(0, firstParagraph)}<p class="placeholder-muted case-lead">${html.slice(firstParagraph + '<p class="placeholder-muted">'.length)}`;
    }
  }

  fs.writeFileSync(file, html, "utf8");
}

console.log(`Modernized ${files.length} portfolio case studies.`);
