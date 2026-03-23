async function applyBrand() {
    try {
        const res = await fetch('/brand-config.json');
        const config = await res.json();
        
        document.querySelectorAll('.brand-logo-container').forEach(el => {
            el.style.display = "block";
            el.style.minHeight = config.logo.height;
            el.style.marginBottom = config.logo.container_padding;
            
            el.innerHTML = `
                <a href="${config.logo.link}" style="display: inline-block; border: none;">
                    <img src="${config.logo.path}" 
                         alt="Logo"
                         style="height: ${config.logo.height}; width: auto; transform: scale(${config.logo.scale}); transform-origin: left top; display: block;"
                         onerror="this.src='/assets/logos/LogoSQBK.jpg'">
                </a>
            `;
        });
    } catch (e) {
        console.log("Antigravity Sync Error", e);
    }
}
document.addEventListener("DOMContentLoaded", applyBrand);
