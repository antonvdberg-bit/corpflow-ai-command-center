# Café International menu — source of truth

**Canonical:** live GoHighLevel custom code on `https://cafeinternational.net/menu-page` (also `/menu`).

**Data feed:** published Google Sheet CSV loaded by that page:

```
https://docs.google.com/spreadsheets/d/e/2PACX-1vTB9dndns4LTTfWMfKJfIMebDrwq02J15PLNbQ4JDVysSuiQcXQjl43QDb2GpHPZ9jMsF_thjrSOyZi/pub?output=csv
```

**Repo snapshot:** `fixtures/website-rescue/cafe-international-menu-sheet.csv` (captured 2026-08-07).

**Do not use:** Drive folder file `CafeInternational_Menu - Sheet1.csv` — outdated (118 rows, missing Drinks, older prices).

**Preview fixture:** `fixtures/website-rescue/cafe-international-menu-preview.json` rebuilt from the live Sheet.

**Known live-page data bugs (do not copy into CorpFlow truth):**
- Menu-page SEO/schema still says Grand Baie in places; approved address is Royal Road, Trou aux Biches.
- Sheet category `Topping Chips and Sauce` (no comma) vs page `desiredOrder` entry with comma — live page may skip that section; preview normalises the name.
