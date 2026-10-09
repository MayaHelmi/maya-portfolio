import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const componentsPath = path.join(root, "design-system/components/site.css");
const colorsPath = path.join(root, "design-system/tokens/colors.css");
const generatedUtilitiesPath = path.join(root, "design-system/tailwind/utilities.css");
const entryPath = path.join(root, "design-system/index.css");
const pageNames = [
  "index.html",
  "about.html",
  "contact.html",
  "projects.html",
  "certificates.html",
  "besign.html",
  "glame-ai.html",
  "noi-beauty-lounge.html",
];

const errors = [];
const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "");
const componentSource = withoutComments(fs.readFileSync(componentsPath, "utf8"));

for (const [lineIndex, line] of componentSource.split("\n").entries()) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("@media") || trimmed.startsWith("@supports")) continue;
  if (/^(?:[\d.%]+\s*,?\s*)+\{/.test(trimmed)) continue;

  const rawUnit = trimmed.match(/-?(?:\d*\.)?\d+(?:px|rem|em|vw|vh|svh|dvh|ch|fr|deg|ms|s|%)/);
  if (rawUnit) {
    errors.push(`components/site.css:${lineIndex + 1} uses raw design value ${rawUnit[0]}`);
  }
}

const declarationRules = new Map([
  ["font-family", ["var("]],
  ["font-size", ["var(", "calc("]],
  ["font-weight", ["var("]],
  ["line-height", ["var("]],
  ["letter-spacing", ["var("]],
  ["border-radius", ["var(", "inherit"]],
  ["box-shadow", ["var(", "none"]],
  ["text-shadow", ["var(", "none"]],
  ["transition", ["var(", "none"]],
  ["animation", ["var(", "none"]],
]);

for (const [lineIndex, line] of componentSource.split("\n").entries()) {
  for (const [property, allowedStarts] of declarationRules) {
    const match = line.match(new RegExp(`${property}\\s*:\\s*([^;}]+)`));
    if (!match) continue;
    const value = match[1].trim();
    if (!allowedStarts.some((allowed) => value.startsWith(allowed))) {
      errors.push(`components/site.css:${lineIndex + 1} contains a raw ${property}: ${value}`);
    }
  }
}

const cssFiles = [];
function collectCss(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectCss(fullPath);
    else if (entry.name.endsWith(".css")) cssFiles.push(fullPath);
  }
}
collectCss(path.join(root, "design-system"));

for (const filePath of cssFiles) {
  /* Tailwind emits a non-rendering browser feature query containing
     rgb(from red ...). It does not introduce an interface colour. */
  if (filePath === colorsPath || filePath === generatedUtilitiesPath) continue;
  const source = withoutComments(fs.readFileSync(filePath, "utf8"));
  if (/(?:#[\da-f]{3,8}\b|rgba?\(|hsla?\()/i.test(source)) {
    errors.push(`${path.relative(root, filePath)} contains a color outside tokens/colors.css`);
  }
}

const entrySource = fs.readFileSync(entryPath, "utf8");
const requiredImports = [
  "tailwind/utilities.css",
  "tokens/colors.css",
  "tokens/typography.css",
  "tokens/spacing.css",
  "tokens/dimensions.css",
  "tokens/shapes.css",
  "tokens/motion.css",
  "tokens/effects.css",
  "tokens/layout.css",
  "components/site.css",
];
for (const requiredImport of requiredImports) {
  if (!entrySource.includes(requiredImport)) errors.push(`design-system/index.css is missing ${requiredImport}`);
}

for (const pageName of pageNames) {
  const page = fs.readFileSync(path.join(root, pageName), "utf8");
  if (!page.includes("design-system/index.css")) errors.push(`${pageName} does not load the design-system entry point`);
  const stylesheetLinks = page.match(/<link\s+rel=["']stylesheet["']/g) || [];
  if (stylesheetLinks.length !== 1) errors.push(`${pageName} must load exactly one stylesheet entry point`);
  if (/href=["'](?:colors|style)\.css/.test(page)) errors.push(`${pageName} still loads a legacy root stylesheet`);
  if (/style=["']/.test(page)) errors.push(`${pageName} contains an inline style`);
}

if (errors.length) {
  console.error("Design-system validation failed:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log("Design-system validation passed.");
