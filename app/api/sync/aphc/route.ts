
import { NextResponse } from 'next/server';
import { getBrowser } from '@/lib/puppeteer';
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserCauselist } from '@/lib/models';

// ... existing imports

export async function POST(request: Request) {
  console.log("--- Starting Sync Process ---");
  try {
    const { userId } = await auth();
    console.log("User ID:", userId);
    
    if (!userId) {
        console.log("Error: Unauthorized");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { advocateCode, highCourt } = await request.json();
    console.log(`Request payload - Advocate Code: ${advocateCode}, High Court: ${highCourt}`);

    if (!advocateCode) {
      console.log("Error: Advocate code missing");
      return NextResponse.json({ error: 'Advocate code is required' }, { status: 400 });
    }
    
    // Only run automation for Andhra Pradesh
    if (highCourt !== "Andhra Pradesh" && highCourt !== "Andhrapradesh") {
         console.log("Automation skipped for region:", highCourt);
         return NextResponse.json({ 
            success: true, 
            message: "Profile updated, but automation only supported for Andhra Pradesh High Court currently.",
            count: 0,
            data: []
        });
    }

    console.log("Connecting to database...");
    await connectToDatabase();
    console.log("Database connected.");

    // Launch puppeteer
    console.log("Launching Puppeteer...");
    // Launch puppeteer
    console.log("Launching Puppeteer...");
    const browser = await getBrowser();
    console.log("Puppeteer launched.");

    const page = await browser.newPage();

    // 1. Navigate directly to the search page (skips the new tab issue)
    console.log("Navigating to https://aphc.gov.in/Hcdbs/search.jsp ...");
    await page.goto('https://aphc.gov.in/Hcdbs/search.jsp', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log("Page loaded.");
    await new Promise(r => setTimeout(r, 5000));

    // 2. Click "Daily Cause List" button
    const dailyCauseListBtnXPath = "//button[contains(., 'Daily Cause List')]";
    console.log("Waiting for 'Daily Cause List' button...");
    await page.waitForSelector('xpath/' + dailyCauseListBtnXPath, { timeout: 10000 });
    const dailyBtns = await page.$$('xpath/' + dailyCauseListBtnXPath);
    if (dailyBtns.length > 0) {
        console.log("Clicking 'Daily Cause List' button...");
        await dailyBtns[0].click();
        await new Promise(r => setTimeout(r, 5000));
    } else {
        console.error("Critical: 'Daily Cause List' button not found");
        throw new Error("Daily Cause List button not found");
    }

    // 3. Click "Advocate Code Wise" button
    const advocateCodeBtnXPath = "//button[contains(., 'ADVOCATE CODE WISE')]";
    console.log("Waiting for 'Advocate Code Wise' button...");
    await page.waitForSelector('xpath/' + advocateCodeBtnXPath, { timeout: 10000 });
    const advBtns = await page.$$('xpath/' + advocateCodeBtnXPath);
    if (advBtns.length > 0) {
        console.log("Clicking 'Advocate Code Wise' button...");
        await advBtns[0].click();
        await new Promise(r => setTimeout(r, 5000));
    } else {
         console.error("Critical: 'Advocate Code Wise' button not found");
         throw new Error("Advocate Code Wise button not found");
    }

    // 4. Enter Code
    const advocateCodeInputSelector = '#advcd';
    console.log(`Entering advocate code: ${advocateCode}...`);
    await page.waitForSelector(advocateCodeInputSelector);
    await page.type(advocateCodeInputSelector, advocateCode);
    await new Promise(r => setTimeout(r, 5000));

    // 5. Submit
    const submitBtnSelector = '.btn_submit';
    console.log("Clicking submit button...");
    await page.waitForSelector(submitBtnSelector);
    await page.click(submitBtnSelector);

    // 7. Wait for results table
    const tableSelector = '#clisttable';
    console.log("Waiting for results table (#clisttable)...");
    try {
        await page.waitForSelector(tableSelector, { timeout: 15000 }); // Increased timeout
        console.log("Results table found.");
        
        // Wait a bit for rows to populate if it's dynamic
        await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
        console.warn("Results table not found or timed out. Possibly no records.");
        // Capture screenshot for debug in real scenario (optional)
        await browser.close();
        return NextResponse.json({ success: true, count: 0, data: [], message: "No results found or timeout" });
    }

    // 8. Extract Data
    console.log("Extracting data from table...");
    const data = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('#clisttable tr'));
        const dataRows = [];
        
        for (const tr of rows) {
            // Check if this is a data row (has td with data-label)
            const sNoCell = tr.querySelector('td[data-label="S.No"]');
            if (sNoCell) {
                const cells = tr.querySelectorAll('td');
                if (cells.length < 6) continue;

                // Helper to get text with newlines for <br>
                const getText = (el: Element | null) => {
                    if (!el) return "";
                    // Clone to not affect DOM
                    const clone = el.cloneNode(true) as HTMLElement;
                    // Replace br with newline
                    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
                     // Replace font with space + text
                    return clone.innerText.trim();
                };

                // Case Details extraction
                // The structure is complex: <b> <a>CaseNo</a> <br> <font>IA..</font> </b>
                const caseDetCell = tr.querySelector('td[data-label="Case Det"]');
                const caseNoEl = caseDetCell?.querySelector('a');
                const rawCaseDetails = getText(caseDetCell);
                // Try to get just the case number mainly
                const caseNumber = caseNoEl?.innerText?.trim() || rawCaseDetails.split('\n')[0];
                
                // Party Details
                const partyCell = tr.querySelector('td[data-label="Party"]');
                const partyText = getText(partyCell);
                
                // Advocates
                const petAdvCell = tr.querySelector('td[data-label="Pet Adv"]');
                const resAdvCell = tr.querySelector('td[data-label="Res Adv"]');
                
                // District
                const districtCell = tr.querySelector('td[data-label="District"]');

                dataRows.push({
                    sNo: getText(sNoCell),
                    caseDet: rawCaseDetails.replace(/\n/g, ' '), // Flatten for simple view
                    caseNumber: caseNumber, // Store specific field if needed later
                    party: partyText.replace(/\n/g, ' '),
                    petAdv: getText(petAdvCell).replace(/\n/g, ', '),
                    resAdv: getText(resAdvCell).replace(/\n/g, ', '),
                    district: getText(districtCell)
                });
            }
        }
        return dataRows;
    });
    console.log(`Extracted ${data.length} records.`);

    await browser.close();
    console.log("Browser closed.");

    // 9. Store Data in DB
    console.log("Updating database...");
    await UserCauselist.findOneAndUpdate(
        { userId, advocateCode, highCourt },
        { 
            lastSyncedAt: new Date(),
            data: data
        },
        { upsert: true, new: true }
    );
    console.log("Database updated successfully.");

    return NextResponse.json({ 
        success: true, 
        count: data.length, 
        data,
        message: `Successfully synced ${data.length} records from High Court.`
    });

  } catch (error: any) {
    console.error('--- Scraping/Sync Error ---');
    console.error(error);
    return NextResponse.json({ error: 'Failed to sync', details: error.message }, { status: 500 });
  }
}
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch user profile to get advocateCode and highCourt
    // We could pass them as query params, but it's safer/easier to rely on what we know about the user
    // actually we need to find the specific UserCauselist for this user
    
    const userCauselist = await UserCauselist.findOne({ userId }).sort({ updatedAt: -1 });

    if (!userCauselist) {
        return NextResponse.json({ success: true, count: 0, data: [] });
    }

    return NextResponse.json({
        success: true,
        count: userCauselist.data?.length || 0,
        data: userCauselist.data || [],
        lastSyncedAt: userCauselist.lastSyncedAt
    });

  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch data', details: error.message }, { status: 500 });
  }
}
