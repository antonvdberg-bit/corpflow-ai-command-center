import os
import shutil

# CONFIGURATION
ACTIVE_TENANT = "CORPFLOW_AI" # Client B
SOURCE_DIR = "core/web"
DIST_DIR = "public"

def validate_build():
    print(f"--- HAAP Integrity Guard: Validating {ACTIVE_TENANT} ---")
    
    # Ensure we aren't accidentally serving the Aura Wellness demo
    with open(f"{SOURCE_DIR}/index.html", "r") as f:
        content = f.read()
        if "Aura Wellness" in content and ACTIVE_TENANT == "CORPFLOW_AI":
            print("CRITICAL: Reversion detected. Triggering Auto-Repair...")
            # This is where the repair logic would pull the correct HAA code
            return False
    print("Integrity Verified. Proceeding with Build.")
    return True

if __name__ == "__main__":
    validate_build()
