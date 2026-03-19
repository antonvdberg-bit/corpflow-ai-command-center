import time, requests, json, os, subprocess
URL = 'https://script.google.com/macros/s/AKfycbz47gS3mSt9co43i-OYzTnfLzKitsEZ3Y4ETIjmupHHbV6U_Oh30dy6kzMGIkRtpSjm9A/exec'
def build(c):
    tmpl = f'<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-black text-white p-20 text-center"><h1 class="text-6xl">{c.get("headline")}</h1><p class="text-2xl mt-10">{c.get("medspa_hook_1")}</p></body></html>'
    with open('index.html', 'w') as f: f.write(tmpl)
    subprocess.run(['git', 'add', '.'])
    subprocess.run(['git', 'commit', '-m', 'SystemUpdate'])
    subprocess.run(['git', 'push'])
while True:
    try:
        r = requests.get(URL).json()
        tasks = r.get('tasks', [])
        if tasks:
            with open('brand-config.json', 'r') as f: cfg = json.load(f)
            for t in tasks: cfg[t['target'].strip()] = t['value']
            with open('brand-config.json', 'w') as f: json.dump(cfg, f, indent=4)
            build(cfg)
            for t in tasks: requests.get(f"{URL}?row={t['row']}&status=✅ Deployed")
    except: pass
    time.sleep(10)
