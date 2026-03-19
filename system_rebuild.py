import time, requests, json, os, subprocess
URL = 'https://script.google.com/macros/s/AKfycbz47gS3mSt9co43i-OYzTnfLzKitsEZ3Y4ETIjmupHHbV6U_Oh30dy6kzMGIkRtpSjm9A/exec'
def build(c):
    tmpl = f'''<!DOCTYPE html><html><head><title>CorpFlowAI | Mauritius</title><script src="https://cdn.tailwindcss.com"></script><style>body {{ background: #020617; color: #f8fafc; font-family: sans-serif; }} .glass {{ background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); }}</style></head><body class="bg-[#020617]"><nav class="p-8 flex justify-between items-center max-w-7xl mx-auto"><img src="/assets/logos/LogoSQBK.png" class="h-12"><div class="hidden md:flex space-x-8 text-[10px] uppercase tracking-widest font-bold text-slate-500"><a href="/proposal-medspa">View Proposal</a></div></nav><main class="max-w-7xl mx-auto px-6 pt-24 text-center"><h1 class="text-7xl font-bold tracking-tighter mb-6">{c.get('headline', 'Scale <span class="italic text-blue-500">Instantly.</span>')}</h1><p class="text-slate-400 text-xl mb-12">{c.get('medspa_hook_1', 'Bespoke autonomous systems for elite service firms.')}</p><section class="glass max-w-4xl mx-auto rounded-[40px] overflow-hidden grid grid-cols-1 md:grid-cols-2 text-left"><div class="p-12 bg-slate-900/50"><h2 class="text-3xl font-bold mb-4">{c.get('agent_name', 'Serenity Concierge')}</h2><p class="text-slate-400 text-sm">{c.get('medspa_hook_2', 'Experience our production-grade agent.')}</p></div><div class="p-12 flex flex-col h-[400px]"><div id="chat-output" class="flex-1 overflow-y-auto space-y-4 text-sm mb-4"><div class="text-blue-400 italic">"{c.get('welcome_msg', 'Namaste. How may I assist you?')}"</div></div><input id="user-input" type="text" placeholder="Type here..." class="w-full bg-slate-800 p-4 rounded-xl text-white outline-none focus:ring-1 focus:ring-blue-500"></div></section></main><script>async function sendMessage() {{ const i = document.getElementById("user-input"); const o = document.getElementById("chat-output"); const m = i.value; if(!m) return; o.innerHTML += "<div class='text-right text-slate-500 mb-2'>"+m+"</div>"; i.value = ""; try {{ const res = await fetch("/api/chat?message="+encodeURIComponent(m)); const d = await res.json(); o.innerHTML += "<div class='text-blue-200 mb-4'>"+d.response+"</div>"; }} catch (e) {{ o.innerHTML += "<div class='text-red-500'>Offline.</div>"; }} o.scrollTop = o.scrollHeight; }} document.getElementById("user-input").addEventListener("keypress", (e) => {{ if(e.key==="Enter") sendMessage(); }});</script></body></html>'''
    with open('index.html', 'w') as f: f.write(tmpl)
    subprocess.run(['git', 'add', '.'])
    subprocess.run(['git', 'commit', '-m', 'ProdSystemUpdate'])
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
