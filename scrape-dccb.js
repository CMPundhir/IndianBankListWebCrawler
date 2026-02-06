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
  "Andhra Pradesh": 1,
  "Arunachal Pradesh": 2,
  "Assam": 3,
  "Bihar": 5,
  "Chhattisgarh": 6,
  "Goa": 7,
  "Gujarat": 8,
  "Haryana": 9,
  "Himachal Pradesh": 10,
  "Jharkhand": 11,
  "Karnataka": 12,
  "Kerala": 13,
  "Madhya Pradesh": 14,
  "Maharashtra": 15,
  "Manipur": 16,
  "Meghalaya": 17,
  "Mizoram": 18,
  "Nagaland": 19,
  "Odisha": 20,
  "Punjab": 21,
  "Rajasthan": 22,
  "Sikkim": 23,
  "Tamil Nadu": 24,
  "Telangana": 25,
  "Tripura": 26,
  "Uttar Pradesh": 27,
  "Uttarakhand": 28,
  "West Bengal": 29
};

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
