#!/usr/bin/env python3
"""Renders the PDF background and one schedule card per event.

Run by the publish workflow before Quarto renders the site. Output goes to
  assets/imgs/pdf-background.png
  assets/imgs/pdf-background-gtk.png
  assets/imgs/cards/<event key>.png
which the RSVP page loads when a guest downloads their schedule.

To run it on your own computer:
  pip install playwright
  playwright install chromium
  python3 _build/render_assets.py
"""
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
BUILD = ROOT / "_build"
IMGS = ROOT / "assets" / "imgs"
CARDS = IMGS / "cards"


def main():
    CARDS.mkdir(parents=True, exist_ok=True)
    warnings = []

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---- PDF background (US Letter) ----
        page = browser.new_page(viewport={"width": 1700, "height": 2200}, device_scale_factor=1)
        page.goto((BUILD / "background.html").as_uri())
        page.locator("#bg").screenshot(path=str(IMGS / "pdf-background.png"))
        page.close()
        print("Rendered", IMGS / "pdf-background.png")

        # ---- PDF background with watercolor trees (Good to know page) ----
        page = browser.new_page(viewport={"width": 1700, "height": 2200}, device_scale_factor=1)
        page.goto((BUILD / "background.html").as_uri() + "#trees")
        page.evaluate("window.BG_READY")
        page.wait_for_timeout(400)
        page.locator("#bg").screenshot(path=str(IMGS / "pdf-background-gtk.png"))
        page.close()
        print("Rendered", IMGS / "pdf-background-gtk.png")

        # ---- One card per event ----
        page = browser.new_page(viewport={"width": 1905, "height": 555}, device_scale_factor=1)
        page.on("pageerror", lambda err: warnings.append("Page error: " + str(err)))
        page.goto((BUILD / "card.html").as_uri())
        keys = page.evaluate("window.WEDDING_EVENTS.map((e) => e.key)")
        if not keys:
            sys.exit("No events found in assets/events-data.js")

        for key in keys:
            warnings.extend(page.evaluate("(k) => renderCard(k)", key))
            out = CARDS / (key + ".png")
            page.locator("#card").screenshot(path=str(out), omit_background=True)
            print("Rendered", out)

        page.close()

        # ---- "Good to know" cards ----
        page = browser.new_page(viewport={"width": 1905, "height": 1600}, device_scale_factor=1)
        page.on("pageerror", lambda err: warnings.append("Page error: " + str(err)))
        page.goto((BUILD / "good_to_know.html").as_uri())
        total_px = 0
        for key in page.evaluate("window.GTK_SECTION_KEYS"):
            result = page.evaluate("(k) => renderSection(k)", key)
            warnings.extend(result["warnings"])
            total_px += result["height"]
            out = CARDS / (key + ".png")
            page.locator("#card").screenshot(path=str(out), omit_background=True)
            print("Rendered", out, "(" + str(result["height"]) + " px tall)")
        # Each page of the PDF holds about 204 mm of cards at 160 mm wide (11.9 px per mm)
        if total_px / 11.9 > 204:
            print("Note: the Good to know cards need more than one PDF page.")

        browser.close()

    for w in warnings:
        print("::warning::" + w)  # shows up as a yellow note in the GitHub Actions log
    if any(w.startswith("Page error") for w in warnings):
        sys.exit(1)


if __name__ == "__main__":
    main()
