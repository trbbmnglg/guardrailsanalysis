let isDrawerOpen = false;
let currentSection = null;

// --- THEME TOGGLE LOGIC ---
function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

// Initialize Theme on Load
if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

// --- DRAWER LOGIC ---
function handleNavClick(section) {
    const drawer = document.getElementById('controlDrawer');
    const drawerTitle = document.getElementById('drawerTitle');
    const sections = ['instruction', 'auth', 'config'];
    const titles = {
        'instruction': 'Agent Instruction',
        'auth': 'Authentication',
        'config': 'Analysis Configuration'
    };

    // Close if clicking same
    if (isDrawerOpen && currentSection === section) {
        closeDrawer();
        return;
    }

    // Reset Styles
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-purple-400', 'bg-white/5', 'border-purple-500', 'text-indigo-600', 'bg-indigo-50', 'border-indigo-600');
        btn.classList.add('border-transparent');
        
        // Dark Mode vs Light Mode handling
        if (document.documentElement.classList.contains('dark')) {
            btn.classList.add('text-slate-500');
        } else {
            btn.classList.add('text-slate-400');
        }
    });

    // Activate Styles
    const activeBtn = document.getElementById('btn-' + section);
    if(activeBtn) {
        activeBtn.classList.remove('border-transparent', 'text-slate-400', 'text-slate-500');
        
        if (document.documentElement.classList.contains('dark')) {
            activeBtn.classList.add('text-purple-400', 'bg-white/5', 'border-purple-500');
        } else {
            activeBtn.classList.add('text-indigo-600', 'bg-indigo-50', 'border-indigo-600');
        }
    }

    // Set Title & Content
    drawerTitle.textContent = titles[section];
    sections.forEach(sec => {
        const el = document.getElementById('content-' + sec);
        if (sec === section) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    // Open Animation
    if (!isDrawerOpen) {
        drawer.classList.remove('w-0');
        drawer.classList.add('w-[450px]');
        isDrawerOpen = true;
    }
    
    currentSection = section;
}

function closeDrawer() {
    const drawer = document.getElementById('controlDrawer');
    drawer.classList.remove('w-[450px]');
    drawer.classList.add('w-0');
    isDrawerOpen = false;
    currentSection = null;

    // Clean styling
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-purple-400', 'bg-white/5', 'border-purple-500', 'text-indigo-600', 'bg-indigo-50', 'border-indigo-600');
        btn.classList.add('border-transparent');
        
        if (document.documentElement.classList.contains('dark')) {
            btn.classList.add('text-slate-500');
        } else {
            btn.classList.add('text-slate-400');
        }
    });
}

// --- RUN AUDIT LOGIC ---
// Note: This adds the UI specific listeners. The analyzer itself adds its own logic in guardrails-analyzer.js
document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
            const key = document.getElementById('apiKey').value;
            const inst = document.getElementById('instructionInput').value;
            if (key && inst) {
                document.getElementById('emptyState').classList.add('hidden');
                document.getElementById('loadingState').classList.remove('hidden');
                closeDrawer();
            }
        });
    }
});

function triggerRun() {
    if (!isDrawerOpen) {
        handleNavClick('instruction');
        return;
    }
    document.getElementById('analyzeBtn').click();
}