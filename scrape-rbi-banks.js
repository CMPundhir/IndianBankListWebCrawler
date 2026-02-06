/**
 * @cmpundhir 07 febb 2026
 * This script doesn't work properly because RBI's website is a mess with inconsistent HTML structure.
 * It can be used as a reference for manual data extraction, but not for automated scraping.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import https from "https";

/* -------------------------------------------------- */
/* SSL FIX for RBI / gov.in sites                     */
/* -------------------------------------------------- */
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

/* -------------------------------------------------- */
/* RBI URL                                           */
/* -------------------------------------------------- */
const RBI_URL =
  "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx";

/* -------------------------------------------------- */
/* STRICT category detection (NO loose matches)      */
/* -------------------------------------------------- */
function detectCategory(text) {
  const t = text.toLowerCase();

  if (t.includes("head offices of nationalised banks"))
    return "Nationalised Bank";

  if (t.includes("private sector banks"))
    return "Private Sector Bank";

  if (t.includes("foreign banks"))
    return "Foreign Bank";

  if (t.includes("small finance banks"))
    return "Small Finance Bank";

  if (t.includes("payments banks"))
    return "Payments Bank";

  if (t.includes("local area banks"))
    return "Local Area Bank";

  if (t.includes("regional rural banks"))
    return "Regional Rural Bank";

  if (t.includes("state co-operative banks"))
    return "State Co-operative Bank";

  if (t.includes("urban co-operative banks"))
    return "Urban Co-operative Bank";

  return null;
}

/* -------------------------------------------------- */
/* Clean bank name extractor                          */
/* -------------------------------------------------- */
function extractBankName(rawText) {
  if (!rawText) return null;

  const lines = rawText
    .split("\n")
    .map(l => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (!lines.length) return null;

  let name = lines[0];

  // Remove serial numbers like "12."
  name = name.replace(/^\d+\.\s*/, "");

  // Reject junk rows
  if (
    name.length < 3 ||
    /^\d+$/.test(name) ||
    name.toLowerCase().includes("head office") ||
    name.toLowerCase().includes("banks in india")
  ) {
    return null;
  }

  return name;
}

/* -------------------------------------------------- */
/* MAIN SCRAPER                                      */
/* -------------------------------------------------- */
async function scrapeRbiBanks() {
  const banks = [];
  const seen = new Set();
  let currentCategory = null;

  const res = await axios.get(RBI_URL, {
    httpsAgent,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
      Accept: "text/html"
    }
  });

  const $ = cheerio.load(res.data);

  $("body")
    .find("a, b, table")
    .each((_, el) => {
      const tag = el.tagName?.toLowerCase();

      /* ---------- CATEGORY DETECTION ---------- */
      if (tag === "a" || tag === "b") {
        const text = $(el).text().trim();
        const cat = detectCategory(text);
        if (cat) currentCategory = cat;
      }

      /* ---------- TABLE PARSING ---------- */
      if (tag === "table" && currentCategory) {
        $(el)
          .find("tr")
          .each((_, row) => {
            const cols = $(row).find("td");

            // Must have Sl No + Name
            if (cols.length < 2) return;

            // Skip section headers
            if ($(cols[0]).attr("colspan") || $(cols[1]).attr("colspan"))
              return;

            const rawText = $(cols[1]).text();
            const name = extractBankName(rawText);
            if (!name) return;

            // HARD FIX for SBI
            let category = currentCategory;
            if (name === "State Bank of India") {
              category = "Nationalised Bank";
            }

            const key = `${name}-${category}`;
            if (seen.has(key)) return;
            seen.add(key);

            banks.push({
              name,
              category
            });
          });
      }
    });

  fs.writeFileSync("banks_rbi.json", JSON.stringify(banks, null, 2));
  console.log(`✅ Saved ${banks.length} banks to banks_rbi.json`);
}

scrapeRbiBanks();
