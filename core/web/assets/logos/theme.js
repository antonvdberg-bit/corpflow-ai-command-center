document.addEventListener("DOMContentLoaded", function() {
    const headerHtml = `
        <nav class="p-8 flex justify-between items-center max-w-7xl mx-auto">
            <a href="/" class="block group">
                <img src="/assets/logos/LogoSQBK.png" alt="CorpFlowAI" 
                     style="height: 120px; width: auto; transform: scale(2.2); transform-origin: left;" 
                     class="transition-transform duration-500 group-hover:scale-[2.3]">
            </a>
            <div class="hidden md:flex space-x-12 text-[10px] uppercase tracking-[0.4em] font-bold text-slate-500">
                <a href="/proposal-medspa" class="hover:text-blue-500 transition">The Proposal</a>
                <a href="/upload" class="hover:text-blue-500 transition">Asset Portal</a>
            </div>
        </nav>
    `;
    const navPlaceholder = document.getElementById('global-nav');
    if(navPlaceholder) navPlaceholder.innerHTML = headerHtml;
});
