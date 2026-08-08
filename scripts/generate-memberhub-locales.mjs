import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "messages", "memberhub.js");
const outputPath = path.join(root, "messages", "memberhub-locales.json");
const source = await readFile(sourcePath, "utf8");
const enMatch = source.match(/const en = (\{[\s\S]*?\n\});\n\nconst vi =/);

if (!enMatch) throw new Error("Unable to locate the English MemberHub dictionary.");

const english = Function(`"use strict"; return (${enMatch[1]});`)();
const localeIds = [
  "fr", "de", "es", "it", "pt", "nl", "pl", "cs", "sk", "sl", "hr", "bs", "sr", "mk", "sq", "bg",
  "ro", "hu", "el", "sv", "no", "da", "fi", "et", "lv", "lt", "ga", "mt", "is", "uk", "ru", "tr",
  "zh", "ja", "ko", "id", "th", "hi", "ar"
];
const entries = Object.entries(english);
const separator = "§§§§§";
const batchSize = 35;

function protect(text) {
  let index = 0;
  return text.replace(/\{[^}]+\}/g, () => `99999${index++}99999`);
}

function restore(text, original) {
  const placeholders = [...original.matchAll(/\{[^}]+\}/g)].map((match) => match[0]);
  return placeholders.reduce(
    (result, placeholder, index) => result.replace(`99999${index}99999`, placeholder),
    text
  );
}

async function translateBatch(texts, locale, attempt = 1) {
  const query = texts.map(protect).join(`\n${separator}\n`);
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", locale);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url, { headers: { "User-Agent": "MemberHub locale generator" } });
    if (!response.ok) throw new Error(`Translation request failed with ${response.status}`);
    const payload = await response.json();
    const translated = payload[0].map((part) => part[0]).join("");
    const parts = translated.split(separator).map((part, index) => restore(part.trim(), texts[index] || ""));
    if (parts.length !== texts.length) throw new Error(`Expected ${texts.length} translations, received ${parts.length}`);
    return parts;
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
    return translateBatch(texts, locale, attempt + 1);
  }
}

let dictionaries = {};
try {
  dictionaries = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  dictionaries = {};
}

for (const locale of localeIds) {
  if (Object.keys(dictionaries[locale] || {}).length === entries.length) {
    process.stdout.write(`Kept ${locale} (${entries.length} keys)\n`);
    continue;
  }
  const dictionary = {};
  for (let index = 0; index < entries.length; index += batchSize) {
    const batch = entries.slice(index, index + batchSize);
    const translated = await translateBatch(batch.map(([, value]) => value), locale);
    batch.forEach(([key], batchIndex) => {
      dictionary[key] = translated[batchIndex];
    });
  }
  dictionaries[locale] = dictionary;
  await writeFile(outputPath, `${JSON.stringify(dictionaries, null, 2)}\n`, "utf8");
  process.stdout.write(`Generated ${locale} (${Object.keys(dictionary).length} keys)\n`);
}

await writeFile(outputPath, `${JSON.stringify(dictionaries, null, 2)}\n`, "utf8");
process.stdout.write(`Wrote ${outputPath}\n`);
