
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserCauselist } from '@/lib/models';

export async function POST(request: Request) {
  console.log("--- Starting Sync Process (TSHC) ---");
  try {
    const { userId } = await auth();
    console.log("User ID:", userId);
    
    if (!userId) {
        console.log("Error: Unauthorized");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { advocateCode, highCourt } = await request.json();
    console.log(`Request payload - Advocate Identity: ${advocateCode}, High Court: ${highCourt}`);

    if (!advocateCode) {
      console.log("Error: Advocate code/name missing");
      return NextResponse.json({ error: 'Advocate code/name is required' }, { status: 400 });
    }
    
    if (highCourt !== "Telangana") {
         return NextResponse.json({ error: "Invalid High Court for this endpoint" }, { status: 400 });
    }

    console.log("Connecting to database...");
    await connectToDatabase();
    console.log("Database connected.");

    // Launch puppeteer
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({
      headless: false, // Set to false for debugging
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--window-size=1280,800' // Optional: explicit window size for better viewing
      ],
    } as any);
    console.log("Puppeteer launched.");

    const page = await browser.newPage();

    // 1. Navigate to TSHC Causelist Portal
    const startUrl = 'https://causelist.tshc.gov.in/'; 
    console.log(`Navigating to ${startUrl} ...`);
    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log("Page loaded.");
    await new Promise(r => setTimeout(r, 3000));

    // 2. Click "Daily Cause List" (It might be an icon or button)
    // Based on user flow, we need to find "Daily List" or "Daily Cause List"
    // We'll search for text content.
    try {
        const dailyListXPath = "//a[contains(., 'Daily List')] | //div[contains(text(), 'Daily List')] | //span[contains(text(), 'Daily List')]";
        console.log("Waiting for 'Daily List' button...");
        await page.waitForSelector('xpath/' + dailyListXPath, { timeout: 10000 });
        const dailyBtns = await page.$$('xpath/' + dailyListXPath);
        if (dailyBtns.length > 0) {
            console.log("Clicking 'Daily Cause List' button...");
            await dailyBtns[0].click();
            await new Promise(r => setTimeout(r, 3000));
        } else {
             console.log("'Daily Cause List' button not found by text, checking URL...");
             // Maybe we are already on the right page or need to look for an icon?
        }
    } catch (e) {
        console.log("Could not find 'Daily Cause List' button (might be on correct page already or strictly icon based). Requesting direct navigation...");
        // Fallback: If the user provided flow implies internal navigation, we might need to be careful.
        // But let's try assuming the button is there.
    }

    // 3. Click "Advocate Wise" 
    // The user said "Advocate Wise" then "Advocate Code Wise".
    // Let's look for "Advocate Wise" first.
    const advWiseXPath = "//a[contains(., 'Advocate Wise')] | //button[contains(., 'Advocate Wise')]";
    try {
        console.log("Looking for 'Advocate Wise' option...");
        await page.waitForSelector('xpath/' + advWiseXPath, { timeout: 10000 });
        const advWiseBtns = await page.$$('xpath/' + advWiseXPath);
        if (advWiseBtns.length > 0) {
            await advWiseBtns[0].click();
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (e) {
        console.log("'Advocate Wise' not found, trying 'Advocate Code Wise' directly...");
    }

    // 4. Click "Advocate Code Wise" - SKIPPED as per user request
    // The form should be available after "Advocate Wise" or default.

    // 5. Enter Input (Advocate Name or Code)
    // We need to find the input field. Common IDs: 'advocateName', 'advName', 'advCd', 'search'.
    // We'll look for an input of type text or search.
    const inputSelector = 'input[type="text"], input[type="search"]'; 
    console.log(`Entering advocate identity: ${advocateCode}...`);
    await page.waitForSelector(inputSelector, { timeout: 10000 });
    
    // Clear and type
    await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLInputElement;
        if(el) el.value = '';
    }, inputSelector);
    await page.type(inputSelector, advocateCode);
    await new Promise(r => setTimeout(r, 1000));

    // 6. Submit
    // Look for a submit button.
    const submitBtnXPath = "//button[contains(., 'Search')] | //button[contains(., 'Submit')] | //input[@type='submit'] | //button[@type='submit']";
    console.log("Clicking submit/search button...");
    await page.waitForSelector('xpath/' + submitBtnXPath);
    const submitBtns = await page.$$('xpath/' + submitBtnXPath);
    if (submitBtns.length > 0) {
        await submitBtns[0].click();
    } else {
        // Try pressing Enter
        await page.keyboard.press('Enter');
    }
    await new Promise(r => setTimeout(r, 5000));

    // 7. Wait for Results Table
    const tableSelector = '#dataTable'; 
    console.log("Waiting for results table (#dataTable)...");
    try {
        await page.waitForSelector(tableSelector, { timeout: 15000 });
        console.log("Table found.");
    } catch (e) {
        console.warn("Table not found or timed out.");
        await browser.close();
        return NextResponse.json({ success: true, count: 0, data: [], message: "No results found" });
    }

    // 8. Extract Data
    console.log("Extracting data from table...");
    const data = await page.evaluate(() => {
        // The page uses id="dataTable" for multiple tables (which is technically invalid HTML but common in legacy sites)
        // We use attribute selector to get all of them.
        const tables = Array.from(document.querySelectorAll('table[id="dataTable"]')); 
        const dataRows: any[] = [];
        
        const cleanText = (text: string | null | undefined) => text ? text.replace(/\s+/g, ' ').trim() : "";

        tables.forEach(table => {
            // Select all rows in the table body
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                
                // standard data row has 6 cells for this layout
                // (S.No, Case, Party Details, Pet Adv, Res Adv, District/Remarks)
                if (cells.length === 6) {
                    const sNo = cleanText(cells[0].innerText);
                    
                    // Case Number is typically in the first anchor tag
                    const caseAnchor = cells[1].querySelector('a');
                    let caseNumber = caseAnchor ? cleanText(caseAnchor.innerText) : "";
                    
                    // Fallback to text if anchor missing
                    if (!caseNumber) {
                        const cellText = cleanText(cells[1].innerText);
                        caseNumber = cellText.split(' ')[0]; // Basic heuristic
                    }

                    const fullCaseDetails = cleanText(cells[1].innerText);

                    // Party Details: "Petitioner vs Respondent"
                    // HTML often has styling, we just want the text.
                    // Normalize "vs" to "Vs" for consistency
                    let partyText = cleanText(cells[2].innerText);
                    partyText = partyText.replace(/\s+vs\s+/i, ' Vs '); 

                    const petAdv = cleanText(cells[3].innerText);
                    const resAdv = cleanText(cells[4].innerText);
                    const district = cleanText(cells[5].innerText);

                    // valid rows generally have a numeric S.No
                    if (sNo && /^\d+$/.test(sNo)) {
                        dataRows.push({
                            sNo,
                            caseNumber,
                            caseDet: fullCaseDetails,
                            party: partyText,
                            petAdv,
                            resAdv,
                            district
                        });
                    }
                }
            });
        });

        return dataRows;
    });

    console.log(`Extracted ${data.length} records.`);
    await browser.close();

    // 9. Store in DB
    console.log("Updating database...");
    await UserCauselist.findOneAndUpdate(
        { userId, advocateCode, highCourt },
        { 
            lastSyncedAt: new Date(),
            data: data
        },
        { upsert: true, new: true }
    );

    return NextResponse.json({ 
        success: true, 
        count: data.length, 
        data,
        message: `Successfully synced ${data.length} records from Telangana High Court.`
    });

  } catch (error: any) {
    console.error('--- TSHC Sync Error ---');
    console.error(error);
    return NextResponse.json({ error: 'Failed to sync TSHC', details: error.message }, { status: 500 });
  }
}
