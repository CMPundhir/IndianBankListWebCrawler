import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import https from "https";

/* ---------------------------------- */
/* SSL FIX for .gov.in sites           */
/* ---------------------------------- */
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

/* ---------------------------------- */
/* Base URL for UCB state pages        */
/* ---------------------------------- */
const BASE_URL =
  "https://cooperatives.gov.in/en/home/cooperative-ucb-list-reports/state/";

/* ---------------------------------- */
/* State mapping (same IDs as portal)  */
/* ---------------------------------- */
const STATES = {
  1: "Andhra Pradesh",
  2: "Arunachal Pradesh",
  3: "Assam",
  4: "Bihar",
  5: "Chhattisgarh",
  6: "Goa",
  7: "Gujarat",
  8: "Haryana",
  9: "Himachal Pradesh",
  10: "Jharkhand",
  11: "Karnataka",
  12: "Kerala",
  13: "Madhya Pradesh",
  14: "Maharashtra",
  15: "Manipur",
  16: "Meghalaya",
  17: "Mizoram",
  18: "Nagaland",
  19: "Odisha",
  20: "Punjab",
  21: "Rajasthan",
  22: "Sikkim",
  23: "Tamil Nadu",
  24: "Telangana",
  25: "Tripura",
  26: "Uttar Pradesh",
  27: "Uttarakhand",
  28: "West Bengal",
  29: "Delhi",
  30: "Jammu & Kashmir",
  31: "Ladakh",
  32: "Puducherry",
  33: "Chandigarh",
  34: "Andaman & Nicobar",
  35: "Dadra & Nagar Haveli and Daman & Diu",
  36: "Lakshadweep"
};

/* ---------------------------------- */
/* Main scraper                        */
/* ---------------------------------- */
async function scrapeUCBs() {
  const results = [];
  const seen = new Set();

  for (const [id, state] of Object.entries(STATES)) {
    try {
      console.log(`🔍 Fetching ${state}...`);

      const res = await axios.get(`${BASE_URL}${id}`, {
        httpsAgent,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
          Accept: "text/html"
        },
        timeout: 20000
      });

      const $ = cheerio.load(res.data);

      $("table tbody tr").each((_, row) => {
        const cols = $(row).find("td");
        if (cols.length < 2) return;

        const name = $(cols[1]).text().trim();

        if (!name) return;

        const key = `${name}-${state}`;
        if (seen.has(key)) return;

        seen.add(key);

        results.push({
          name,
          state,
          category: "Urban Co-operative Banks"
        });
      });
    } catch (err) {
      console.error(`❌ Failed for ${state}`, err.message);
    }
  }

  fs.writeFileSync("ucb.json", JSON.stringify(results, null, 2));
  console.log(`\n✅ Saved ${results.length} Urban Co-op Banks to ucb.json`);
}

scrapeUCBs();
