async function applyBrand() {
    const res = await fetch('/brand-config.json');
    const config = await res.json();
    
    // Auto-update all logo containers
    document.querySelectorAll('.brand-logo-container').forEach(el => {
        el.innerHTML = `
            <a href="${config.logo.link}">
                <img src="${config.logo.path}" 
                     style="height: ${config.logo.height}; transform: scale(${config.logo.scale}); transform-origin: left;"
                     class="transition-all duration-300">
            </a>
        `;
    });
}
document.addEventListener("DOMContentLoaded", applyBrand);
