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
/* HTTPS Agent (ignore SSL issues)    */
/* ---------------------------------- */
const agent = new https.Agent({
  rejectUnauthorized: false
});

async function scrapeStates() {
  const results = [];

  for (let pageId = 1; pageId <= 40; pageId++) {
    const url = `${BASE_URL}${pageId}`;

    try {
      const { data } = await axios.get(url, { httpsAgent: agent });
      const $ = cheerio.load(data);

      // 🔑 Find the element that contains "State :-"
      let stateText = "";

      $("body *").each((_, el) => {
        const text = $(el).text().trim();
        if (text.startsWith("State :-")) {
          stateText = text;
          return false; // break loop
        }
      });

      if (!stateText) continue;

      // ✅ Extract only the state name
      const state = stateText
        .replace("State :-", "")
        .split("\n")[0]
        .trim();

      results.push({
        page_id: pageId,
        state
      });

      console.log(`✔ ${pageId} → ${state}`);
    } catch {
      // ignore invalid pages
    }
  }

  fs.writeFileSync(
    "ucb_state_pages.json",
    JSON.stringify(results, null, 2)
  );

  console.log(
    `\n✅ Saved ${results.length} state mappings to ucb_state_pages.json`
  );
}

scrapeStates();
