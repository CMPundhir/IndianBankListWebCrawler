/**
 * Scraper for District Central Cooperative Banks (DCCBs)
 * Source: https://cooperatives.gov.in/en/home/dccb-reports
 * Output: dccb.json
 */

import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import https from "https";

/**
 * HTTPS agent to bypass broken SSL chain on .gov.in sites
 * SAFE for scraping public data
 */
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * Base URL (state-wise)
 */
const BASE_URL =
  "https://cooperatives.gov.in/en/home/dccb-list-reports/state/";

/**
 * State → ID mapping used by the portal
 */
const STATES = {
  "ANDHRA PRADESH": 28,
  "BIHAR": 10,
  "CHHATTISGARH": 22,
  "GUJARAT": 24,
  "HARYANA": 6,
  "HIMACHAL PRADESH": 2,
  "JAMMU AND KASHMIR": 1,
  "JHARKHAND": 20,
  "KARNATAKA": 29,
  "MADHYA PRADESH": 23,
  "MAHARASHTRA": 27,
  "ODISHA": 21,
  "PUNJAB": 3,
  "RAJASTHAN": 8,
  "TAMIL NADU": 33,
  "TELANGANA": 36,
  "UTTAR PRADESH": 9,
  "UTTARAKHAND": 5,
  "WEST BENGAL": 19
}


/**
 * Delay helper (avoid rate-limiting)
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Final result array
 */
const banks = [];

async function scrape() {
  for (const [state, id] of Object.entries(STATES)) {
    try {
      console.log(`🔍 Fetching ${state}...`);

      const response = await axios.get(`${BASE_URL}${id}`, {
        httpsAgent,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Accept: "text/html"
        },
        timeout: 20000
      });

      const $ = cheerio.load(response.data);

      $("table tbody tr").each((_, row) => {
        const cols = $(row).find("td");
        const name = cols.eq(1).text().trim();

        if (name) {
          banks.push({
            name,
            state,
            category: "District Central Cooperative BANKS"
          });
        }
      });

      // polite delay
      await sleep(1200);
    } catch (err) {
      console.error(`❌ Failed for ${state}: ${err.message}`);
    }
  }

  fs.writeFileSync("dccb.json", JSON.stringify(banks, null, 2));
  console.log(`\n✅ DONE: Saved ${banks.length} banks to dccb.json`);
}

/**
 * Run
 */
scrape();
