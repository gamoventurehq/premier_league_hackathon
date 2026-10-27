import asyncio
import os
from playwright.async_api import async_playwright

os.makedirs("media_gen/previews/scale_test", exist_ok=True)

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu"])
        
        # Test 1: 1920x1080 default
        ctx1 = await browser.new_context(viewport={"width": 1920, "height": 1080})
        p1 = await ctx1.new_page()
        await p1.goto("http://localhost:5173/dashboard", wait_until="networkidle")
        await asyncio.sleep(2)
        await p1.screenshot(path="media_gen/previews/scale_test/1920x1080_default.png")
        await ctx1.close()

        # Test 2: 1920x1080 with 1.25 deviceScaleFactor / zoom
        ctx2 = await browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1.25)
        p2 = await ctx2.new_page()
        await p2.goto("http://localhost:5173/dashboard", wait_until="networkidle")
        await asyncio.sleep(2)
        await p2.screenshot(path="media_gen/previews/scale_test/1920x1080_scale125.png")
        await ctx2.close()

        # Test 3: 1600x900 viewport (tighter, natural desktop scale)
        ctx3 = await browser.new_context(viewport={"width": 1536, "height": 864})
        p3 = await ctx3.new_page()
        await p3.goto("http://localhost:5173/dashboard", wait_until="networkidle")
        await asyncio.sleep(2)
        await p3.screenshot(path="media_gen/previews/scale_test/1536x864.png")
        await ctx3.close()

        await browser.close()
        print("Scale test screenshots captured!")

if __name__ == "__main__":
    asyncio.run(test())
