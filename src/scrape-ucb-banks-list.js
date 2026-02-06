import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import https from "https";

/* ---------------------------------- */
/* Base URL                            */
/* ---------------------------------- */
const BASE_URL =
  "https://cooperatives.gov.in/en/home/cooperative-ucb-list-reports/state/";

/* ---------------------------------- */
/* HTTPS Agent                         */
/* ---------------------------------- */
const agent = new https.Agent({
  rejectUnauthorized: false
});

async function scrapeUCB() {
  const banks = [];

  for (let pageId = 1; pageId <= 40; pageId++) {
    const url = `${BASE_URL}${pageId}`;

    try {
      const { data } = await axios.get(url, { httpsAgent: agent });
      const $ = cheerio.load(data);

      /* ------------------------------- */
      /* Extract State                   */
      /* ------------------------------- */
      let state = "";

      $("body *").each((_, el) => {
        const text = $(el).text().trim();
        if (text.startsWith("State :-")) {
          state = text.replace("State :-", "").split("\n")[0].trim();
          return false;
        }
      });

      if (!state) continue;

      /* ------------------------------- */
      /* Extract Banks                   */
      /* ------------------------------- */
      $("table tbody tr").each((_, row) => {
        const cols = $(row).find("td");
        if (cols.length < 2) return;

        const name = $(cols[1])
          .text()
          .replace(/\s+/g, " ")
          .trim();

        if (!name || name.toLowerCase().includes("total")) return;

        banks.push({
          page_id: pageId,
          name,
          state,
          category: "Urban Co-operative Banks"
        });
      });

      console.log(`✔ ${state}`);
    } catch {
      // skip invalid pages
    }
  }

  fs.writeFileSync(
    "urban_cooperative_banks.json",
    JSON.stringify(banks, null, 2)
  );

  console.log(`\n✅ Saved ${banks.length} banks`);
}

scrapeUCB();
