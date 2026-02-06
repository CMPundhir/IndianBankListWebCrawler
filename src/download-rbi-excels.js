import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs-extra";
import path from "path";
import XLSX from "xlsx";
import https from "https";
import { fileURLToPath } from "url";

/* __dirname fix for ESM */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGE_URL = "https://www.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=2009";
const DOWNLOAD_DIR = path.join(__dirname, "excels");
const OUTPUT_FILE = path.join(__dirname, "merged_banks.xlsx");

/* RBI SSL workaround */
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function downloadFile(url, filename) {
  const filePath = path.join(DOWNLOAD_DIR, filename);

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    httpsAgent
  });

  await fs.writeFile(filePath, response.data);
  return filePath;
}

async function main() {
  await fs.ensureDir(DOWNLOAD_DIR);

  console.log("🔍 Fetching RBI page...");
  const { data: html } = await axios.get(PAGE_URL, { httpsAgent });

  const $ = cheerio.load(html);
  const excelLinks = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    if (/\.(xls|xlsx)$/i.test(href)) {
      const fullUrl = href.startsWith("http")
        ? href
        : `https://www.rbi.org.in${href}`;
      excelLinks.push(fullUrl);
    }
  });

  if (excelLinks.length === 0) {
    console.error("❌ No Excel files found");
    return;
  }

  console.log(`📥 Found ${excelLinks.length} Excel files`);

  const mergedRows = [];

  for (const link of excelLinks) {
    const fileName = path.basename(link);
    console.log(`⬇️ Downloading ${fileName}`);

    const filePath = await downloadFile(link, fileName);
    const workbook = XLSX.readFile(filePath);

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      rows.forEach(row => {
        mergedRows.push({
          ...row,
          source_file: fileName,
          source_sheet: sheetName
        });
      });
    });
  }

  console.log(`🧩 Total rows merged: ${mergedRows.length}`);

  const sheet = XLSX.utils.json_to_sheet(mergedRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "ALL_BANKS");

  XLSX.writeFile(wb, OUTPUT_FILE);

  console.log(`✅ Created merged Excel: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error("🔥 Error:", err);
});
