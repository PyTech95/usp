import asyncio, sys
from playwright.async_api import async_playwright
async def main(url, out):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1568, "height": 1000})
        await pg.goto(url, wait_until="networkidle")
        h = await pg.evaluate("document.documentElement.scrollHeight")
        for y in range(0, h, 600):
            await pg.evaluate(f"window.scrollTo(0,{y})"); await pg.wait_for_timeout(150)
        await pg.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'))")
        await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=out, full_page=True, type="jpeg", quality=60)
        await b.close()
asyncio.run(main(sys.argv[1], sys.argv[2]))
