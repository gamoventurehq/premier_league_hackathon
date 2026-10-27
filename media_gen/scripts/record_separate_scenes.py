import asyncio
import os
import shutil
from playwright.async_api import async_playwright

OUT_DIR = "media_gen/video_v3"

async def record_personas():
    temp_dir = "media_gen/temp_personas"
    os.makedirs(temp_dir, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"])
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=temp_dir,
            record_video_size={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        await page.goto("http://localhost:5173/personas", wait_until="networkidle")
        await asyncio.sleep(2)
        
        # 1. Switch persona tabs
        print("Toggling Casual and Player Cam...")
        await page.click("button:has-text('Casual')", timeout=3000)
        await asyncio.sleep(3)
        await page.click("button:has-text('Player Cam')", timeout=3000)
        await asyncio.sleep(3)
        await page.click("button:has-text('Analyst')", timeout=3000)
        await asyncio.sleep(2)
        
        # 2. Scroll to Multilingual Broadcast Stream section & expand it
        print("Scrolling down and expanding full commentary...")
        await page.evaluate("window.scrollBy({ top: 800, behavior: 'smooth' })")
        await asyncio.sleep(2)
        
        try:
            await page.click("button:has-text('View full feed')", timeout=3000)
            await asyncio.sleep(2)
            print("Switching to Spanish, Japanese, Arabic...")
            await page.click("button:has-text('Español (ES)')", timeout=3000)
            await asyncio.sleep(2.5)
            await page.click("button:has-text('日本語 (JA)')", timeout=3000)
            await asyncio.sleep(2.5)
            await page.click("button:has-text('العربية (AR)')", timeout=3000)
            await asyncio.sleep(2.5)
        except Exception as e:
            print("Language expansion error:", e)
        
        await asyncio.sleep(1)
        await context.close()
        await browser.close()
        
        files = [f for f in os.listdir(temp_dir) if f.endswith(".webm")]
        if files:
            src = os.path.join(temp_dir, files[0])
            dst = os.path.join(OUT_DIR, "scene4_personas.webm")
            shutil.move(src, dst)
            shutil.rmtree(temp_dir, ignore_errors=True)
            print(f"Saved: {dst}")

if __name__ == "__main__":
    asyncio.run(record_personas())
