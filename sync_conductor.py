import time, requests, json, os
URL = os.getenv("GOOGLE_SCRIPT_URL", "").strip()
def run():
    print("🛡️ VERIFIED ENGINE START.")
    if not URL:
        raise ValueError("GOOGLE_SCRIPT_URL is not configured")
    while True:
        try:
            r = requests.get(f"{URL}?cb={int(time.time())}", timeout=5).json()
            for t in r.get('tasks', []):
                tgt, val, row = t['target'].strip(), t['value'], t['row']
                with open('brand-config.json', 'r') as f: cfg = json.load(f)
                cfg[tgt] = val
                with open('brand-config.json', 'w') as f: json.dump(cfg, f, indent=4)
                with open('brand-config.json', 'r') as f:
                    if str(json.load(f).get(tgt)) == str(val):
                        print(f"✅ TEST PASSED: {tgt}")
                        requests.get(f"{URL}?row={row}&status=✅ Deployed")
            time.sleep(5)
        except: time.sleep(5)
if __name__ == '__main__': run()
