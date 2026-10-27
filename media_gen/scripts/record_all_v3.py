import asyncio
import os
import shutil
from playwright.async_api import async_playwright

RAW_DIR = "media_gen/raw_captures_v3"
OUT_DIR = "media_gen/video_v3"

async def capture_segment(page, duration_sec):
    await asyncio.sleep(duration_sec)

async def run():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
        )
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=RAW_DIR,
            record_video_size={"width": 1920, "height": 1080}
        )
        page = await context.new_page()

        # ==========================================
        # SCENE 1: Master Dashboard Live Simulation (19s)
        # ==========================================
        print("Recording Scene 1: Master Dashboard...")
        await page.goto("http://localhost:5173/dashboard", wait_until="networkidle")
        await asyncio.sleep(3)
        # Click different player pills to show dynamic spotlight speed and attributes
        try:
            await page.click("text=Haaland #9", timeout=3000)
            await asyncio.sleep(3)
            await page.click("text=Foden #47", timeout=3000)
            await asyncio.sleep(3)
            await page.click("text=De Bruyne #17", timeout=3000)
        except Exception:
            pass
        # Trigger lower-third overlay on the video feed
        try:
            await page.click("button:has-text('Dominance')", timeout=3000)
            await asyncio.sleep(3)
            await page.click("button:has-text('Goal 42')", timeout=3000)
        except Exception:
            pass
        await asyncio.sleep(4)

        # ==========================================
        # SCENE 2: Judge Quick Tour Modal Walkthrough (17s)
        # ==========================================
        print("Recording Scene 2: Judge Quick Tour...")
        try:
            await page.click("button:has-text('Judge Quick Tour')", timeout=3000)
            await asyncio.sleep(3)
            # Step through the 4 tour steps
            await page.click("button:has-text('Next Step')", timeout=3000)
            await asyncio.sleep(3)
            await page.click("button:has-text('Next Step')", timeout=3000)
            await asyncio.sleep(3)
            await page.click("button:has-text('Next Step')", timeout=3000)
            await asyncio.sleep(3)
            await page.keyboard.press("Escape")
        except Exception as e:
            print("Judge tour interaction error:", e)
        await asyncio.sleep(2)

        # ==========================================
        # SCENE 3: Live Pitch Radar & Tactical Intelligence (21s)
        # ==========================================
        print("Recording Scene 3: Pitch Radar & Tactical Page...")
        await page.goto("http://localhost:5173/pitch", wait_until="networkidle")
        await asyncio.sleep(2)
        # Cycle camera angles
        try:
            await page.click("text=Pressing Zone", timeout=3000)
            await asyncio.sleep(4)
            await page.click("text=Attacking Box", timeout=3000)
            await asyncio.sleep(4)
            await page.click("text=Overhead (105m)", timeout=3000)
        except Exception:
            pass
        await asyncio.sleep(2)
        # Go to Tactical page to see blackboard PDR & rhythm
        await page.goto("http://localhost:5173/tactical", wait_until="networkidle")
        await asyncio.sleep(4)
        await page.evaluate("window.scrollBy({ top: 200, behavior: 'smooth' })")
        await asyncio.sleep(5)

        # ==========================================
        # SCENE 4: Personas & Multilingual Commentary (23s)
        # ==========================================
        print("Recording Scene 4: Persona Experience & 5-Language Stream...")
        await page.goto("http://localhost:5173/personas", wait_until="networkidle")
        await asyncio.sleep(2)
        # Switch to Casual Experience
        try:
            await page.click("text=Casual Experience", timeout=3000)
            await asyncio.sleep(3)
            await page.click("text=Player Cam", timeout=3000)
            await asyncio.sleep(3)
            await page.click("text=Analyst Experience", timeout=3000)
            await asyncio.sleep(3)
        except Exception:
            pass
        # Cycle languages (Spanish, French, Japanese, Arabic)
        try:
            await page.click("text=Español (ES)", timeout=3000)
            await asyncio.sleep(3)
            await page.click("text=日本語 (JA)", timeout=3000)
            await asyncio.sleep(3)
            await page.click("text=العربية (AR)", timeout=3000)
            await asyncio.sleep(3)
            await page.click("text=English (EN)", timeout=3000)
        except Exception:
            pass
        await asyncio.sleep(3)

        # ==========================================
        # SCENE 5: Diagnostics, Scenario Injection & Studio Teleprompter (21s)
        # ==========================================
        print("Recording Scene 5: Scenario Injector & Teleprompter Modal...")
        await page.goto("http://localhost:5173/diagnostics", wait_until="networkidle")
        await asyncio.sleep(2)
        # Inject scenario
        try:
            await page.click("button:has-text('Inject Sustained Low-Block Siege')", timeout=4000)
            await asyncio.sleep(3)
        except Exception:
            pass
        # Return to dashboard and open HT Studio Teleprompter
        await page.goto("http://localhost:5173/dashboard", wait_until="networkidle")
        await asyncio.sleep(2)
        try:
            await page.click("button:has-text('HT Studio Teleprompter')", timeout=4000)
            await asyncio.sleep(3)
            await page.click("button:has-text('Chapters')", timeout=4000)
            await asyncio.sleep(4)
            await page.click("button:has-text('Publication')", timeout=4000)
            await asyncio.sleep(5)
        except Exception:
            pass

        await context.close()
        await browser.close()
        print("Recording session completed successfully!")

if __name__ == "__main__":
    asyncio.run(run())
