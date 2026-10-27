import asyncio
import os
import shutil
from playwright.async_api import async_playwright

async def record():
    os.makedirs("media_gen/raw_captures", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"])
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir="media_gen/raw_captures",
            record_video_size={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        
        # 1. First go to /diagnostics and inject scenario so viewers see the tactical injection in action
        print("1. Navigating to /diagnostics to inject scenario...")
        await page.goto("http://localhost:5173/diagnostics", wait_until="networkidle")
        await asyncio.sleep(2)
        print("Clicking Sustained Low-Block Siege...")
        try:
            await page.click("button:has-text('Inject Sustained Low-Block Siege')", timeout=4000)
        except Exception as e:
            print("Failed to click scenario button:", e)
        await asyncio.sleep(3)

        # 2. Navigate to /dashboard and open HT Studio Teleprompter
        print("2. Navigating to /dashboard...")
        await page.goto("http://localhost:5173/dashboard", wait_until="networkidle")
        await asyncio.sleep(2)

        print("Opening HT Studio Teleprompter modal...")
        await page.click("button:has-text('HT Studio Teleprompter')", timeout=4000)
        await asyncio.sleep(2.5)

        # 3. Switch to Chapters tab
        print("Clicking Chapters tab...")
        await page.click("button:has-text('Chapters')", timeout=4000)
        await asyncio.sleep(3.5)

        # 4. Switch to Publication tab
        print("Clicking Publication tab...")
        await page.click("button:has-text('Publication')", timeout=4000)
        await asyncio.sleep(3.5)

        await context.close()
        await browser.close()

        video_files = sorted([f for f in os.listdir("media_gen/raw_captures") if f.endswith(".webm")])
        if video_files:
            latest = video_files[-1]
            src = os.path.join("media_gen/raw_captures", latest)
            dst = "media_gen/video/scene5_scenarios_rich.webm"
            shutil.move(src, dst)
            print(f"Recorded and saved rich scene 5 to: {dst}")

if __name__ == "__main__":
    asyncio.run(record())
