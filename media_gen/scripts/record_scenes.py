import asyncio
import os
import shutil
from playwright.async_api import async_playwright

OUTPUT_DIR = "media_gen/video"

async def record_scene(page_name, duration_sec, actions_fn, out_name):
    os.makedirs("media_gen/raw_captures", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"])
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir="media_gen/raw_captures",
            record_video_size={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        print(f"Navigating to {page_name}...")
        await page.goto(f"http://localhost:5173{page_name}", wait_until="networkidle")
        await asyncio.sleep(2)  # initial render settlement

        await actions_fn(page)
        
        await asyncio.sleep(1)
        await context.close()
        await browser.close()
        
        # Move video to destination
        video_files = sorted([f for f in os.listdir("media_gen/raw_captures") if f.endswith(".webm")])
        if video_files:
            latest = video_files[-1]
            src = os.path.join("media_gen/raw_captures", latest)
            dst = os.path.join(OUTPUT_DIR, out_name)
            shutil.move(src, dst)
            print(f"Recorded and saved: {dst}")

async def scene1_actions(page):
    print("Action 1: Master Dashboard live stream and zoom...")
    await asyncio.sleep(5)
    # Scroll slightly down or hover on telemetry cards
    await page.evaluate("window.scrollBy({ top: 150, behavior: 'smooth' })")
    await asyncio.sleep(5)
    await page.evaluate("window.scrollBy({ top: -150, behavior: 'smooth' })")
    await asyncio.sleep(9)

async def scene2_actions(page):
    print("Action 2: Pitch Radar 3D / Camera angles...")
    await asyncio.sleep(3)
    # Click Pressing Zone
    try:
        await page.click("text=Pressing Zone", timeout=3000)
    except Exception:
        pass
    await asyncio.sleep(5)
    # Click Attacking Box
    try:
        await page.click("text=Attacking Box", timeout=3000)
    except Exception:
        pass
    await asyncio.sleep(5)
    # Click Overhead
    try:
        await page.click("text=Overhead (105m)", timeout=3000)
    except Exception:
        pass
    await asyncio.sleep(8)

async def scene3_actions(page):
    print("Action 3: Swarm and Blackboard Diagnostics...")
    await asyncio.sleep(4)
    # Scroll to Blackboard inspect
    await page.evaluate("window.scrollBy({ top: 300, behavior: 'smooth' })")
    await asyncio.sleep(6)
    await page.evaluate("window.scrollBy({ top: 300, behavior: 'smooth' })")
    await asyncio.sleep(9)

async def scene4_actions(page):
    print("Action 4: Personas and Broadcast Overlays...")
    await asyncio.sleep(3)
    # Click Casual Experience
    try:
        await page.click("text=Casual Experience", timeout=3000)
    except Exception:
        pass
    await asyncio.sleep(5)
    # Click Player Cam
    try:
        await page.click("text=Player Cam", timeout=3000)
    except Exception:
        pass
    await asyncio.sleep(5)
    # Click Analyst Experience
    try:
        await page.click("text=Analyst Experience", timeout=3000)
    except Exception:
        pass
    await asyncio.sleep(6)

async def scene5_actions(page):
    print("Action 5: Scenario Injector and HT Teleprompter...")
    # Click Sustained Low-Block Siege
    try:
        await page.click("text=Sustained Low-Block Siege", timeout=3000)
    except Exception:
        pass
    await asyncio.sleep(5)
    # Open HT Studio Teleprompter modal
    try:
        await page.click("text=HT Studio Teleprompter", timeout=3000)
    except Exception:
        pass
    await asyncio.sleep(4)
    # Switch to Video Chapters
    try:
        await page.click("text=Video Chapters", timeout=3000)
    except Exception:
        pass
    await asyncio.sleep(4)
    # Switch to Digital Publication
    try:
        await page.click("text=Digital Publication", timeout=3000)
    except Exception:
        pass
    await asyncio.sleep(4)

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    await record_scene("/dashboard", 20, scene1_actions, "scene1_dashboard.webm")
    await record_scene("/pitch", 22, scene2_actions, "scene2_pitch.webm")
    await record_scene("/diagnostics", 20, scene3_actions, "scene3_diagnostics.webm")
    await record_scene("/personas", 19, scene4_actions, "scene4_personas.webm")
    await record_scene("/diagnostics", 17, scene5_actions, "scene5_scenarios.webm")

if __name__ == "__main__":
    asyncio.run(main())
