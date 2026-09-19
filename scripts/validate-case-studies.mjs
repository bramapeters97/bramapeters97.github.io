import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

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

const failures = [];
const summaries = [];

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<a class="case-skip"[\s\S]*?<\/a>/i, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const originalHtml = execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" });
  const required = [
    'href="assets/css/case-study.css"',
    '<body class="portfolio-case">',
    'class="case-skip"',
    'class="case-eyebrow"',
    'id="case-content"',
    'class="card case-meta"',
    'class="case-section-heading"',
  ];

  for (const marker of required) {
    if (!html.includes(marker)) failures.push(`${file}: missing ${marker}`);
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) failures.push(`${file}: duplicate IDs ${[...new Set(duplicateIds)].join(", ")}`);

  const localReferences = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((reference) => !/^(?:https?:|#|mailto:|tel:|javascript:)/i.test(reference))
    .filter((reference) => !reference.includes("%"));

  for (const reference of localReferences) {
    const cleanReference = reference.split("?")[0].split("#")[0];
    if (cleanReference && !fs.existsSync(path.resolve(path.dirname(file), cleanReference))) {
      failures.push(`${file}: missing local asset ${reference}`);
    }
  }

  for (const tag of ["header", "main", "section", "article", "aside", "h2"]) {
    const opens = (html.match(new RegExp(`<${tag}(?:\\s|>)`, "gi")) || []).length;
    const closes = (html.match(new RegExp(`</${tag}>`, "gi")) || []).length;
    if (opens !== closes) failures.push(`${file}: unbalanced <${tag}> (${opens} open, ${closes} close)`);
  }

  if (visibleText(html) !== visibleText(originalHtml)) {
    failures.push(`${file}: visible narrative text changed unexpectedly`);
  }

  summaries.push({
    file,
    sections: (html.match(/class="case-section-heading"/g) || []).length,
    cards: (html.match(/<article class="card"/g) || []).length,
    media: (html.match(/<(?:img|video|iframe)\b/g) || []).length,
  });
}

const css = fs.readFileSync("assets/css/case-study.css", "utf8");
const openBraces = (css.match(/{/g) || []).length;
const closeBraces = (css.match(/}/g) || []).length;
if (openBraces !== closeBraces) failures.push(`case-study.css: unbalanced braces (${openBraces}/${closeBraces})`);

console.table(summaries);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("All case-study checks passed.");
}
