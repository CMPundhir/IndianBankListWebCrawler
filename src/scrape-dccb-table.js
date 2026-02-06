/**
 * Scrapes the DCCB table from the given URL and saves it as a JSON file.
 * This Json will be used by scrape-dccb.js to get the list of states and their corresponding IDs.
 */


import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

const URL = "https://cooperatives.gov.in/en/home/dccb-reports";

async function scrapeDCCBTable() {
  const response = await axios.get(URL, {
    httpsAgent: new (await import("https")).Agent({
      rejectUnauthorized: false
    })
  });

  const $ = cheerio.load(response.data);

  const result = [];

  // Target the main table
  $("table tbody tr").each((_, row) => {
    const cols = $(row).find("td");

    if (cols.length < 2) return;

    const stateAnchor = $(cols[1]).find("a");

    const stateName = stateAnchor.text().trim();
    const stateUrl = stateAnchor.attr("href");

    if (!stateName || !stateUrl) return;

    // Extract last numeric ID from URL
    const match = stateUrl.match(/\/(\d+)$/);
    const stateId = match ? Number(match[1]) : null;

    result.push({
      state: stateName,
      state_id: stateId,
      state_url: stateUrl
    });
  });

  fs.writeFileSync(
    "dccb_states.json",
    JSON.stringify(result, null, 2)
  );

  console.log(`✅ Saved ${result.length} rows to dccb_states.json`);
}

scrapeDCCBTable().catch(console.error);
