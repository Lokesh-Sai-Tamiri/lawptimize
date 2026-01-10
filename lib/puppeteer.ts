
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function getBrowser() {
    let browser;
    // Check if running on Vercel or in Production environment
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        try {
            console.log("Launching Puppeteer with @sparticuz/chromium...");
            
            // Cast to any to avoid type issues with different versions
            const chromiumPack = chromium as any;

            browser = await puppeteer.launch({
                args: chromiumPack.args,
                defaultViewport: chromiumPack.defaultViewport || { width: 1280, height: 720 },
                executablePath: await chromiumPack.executablePath(),
                headless: chromiumPack.headless === undefined ? true : chromiumPack.headless,
                ignoreHTTPSErrors: true,
            } as any); 
        } catch (error) {
            console.error("Failed to launch browser on Vercel:", error);
            throw error;
        }
    } else {
        // Local development
        console.log("Launching local Puppeteer...");
        try {
            // Dynamic import to avoid bundling full puppeteer in production
            const { default: puppeteerLocal } = await import('puppeteer'); 
            browser = await puppeteerLocal.launch({
                headless: false, // Default to false locally for debugging
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--window-size=1280,800'
                ],
                ignoreHTTPSErrors: true,
            } as any);
        } catch (e) {
             console.error("Local puppeteer import failed:", e);
             throw new Error("Local puppeteer import failed. Ensure 'puppeteer' is installed in devDependencies.");
        }
    }
    return browser;
}
