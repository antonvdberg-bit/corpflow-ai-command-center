from flask import Flask, request, jsonify
import subprocess, json, os

app = Flask(__name__)

@app.route('/execute', methods=['POST'])
def execute():
    data = request.json
    target = data.get('target')
    value = data.get('value')
    
    # 1. Update the JSON config
    with open('brand-config.json', 'r') as f: cfg = json.load(f)
    cfg[target] = value
    with open('brand-config.json', 'w') as f: json.dump(cfg, f, indent=4)
    
    # 2. Trigger the Build & Push to Vercel
    # (Using your verified HTML template logic)
    subprocess.run(['python3', 'system_rebuild.py', '--once']) 
    return jsonify({"status": "Success", "applied": target})

if __name__ == '__main__':
    app.run(port=5000)
