(function () {
    "use strict";

    const COPIES = 80; // Massive card count to ensure we never see the "black gap"
    const MID_COPY = 40; // The safe "reset zone"
    const LEVER_TRIGGER = 45;

    const deckData = globalThis.WAYSTO_DECKS || {};
    const decks = [
        { id: "waysTo", label: "Ways To", values: deckData.waysTo || ["Design", "Build", "Scale", "Fix", "Optimize"] },
        { id: "users", label: "Users", values: deckData.users || ["Developers", "Designers", "Managers", "End-Users"] },
        { id: "limit", label: "Design Limit", values: deckData.limit || ["Budget", "Timeframe", "Technology", "Usability"] },
        { id: "audience", label: "Audience", values: deckData.audience || ["Enterprise", "Consumer", "Internal", "Global"] },
        { id: "extra", label: "Constraints+", values: deckData.extra || ["Legacy Code", "Security", "Privacy", "AI Integration"] }
    ];

    const state = { reels: [], spinning: false };
    const els = { reelBank: document.getElementById("reelBank"), lever: document.getElementById("lever"), spinBtn: document.getElementById("spinButton") };

    function build() {
        els.reelBank.innerHTML = "";
        state.reels = [];
        
        decks.forEach((deck, i) => {
            const container = document.createElement("div");
            container.className = "reel-container";
            container.innerHTML = `
                <div class="reel-header">
                    <div class="reel-title">${deck.label}</div>
                    <button class="lock-toggle" id="lock-${i}">UNLOCK</button>
                </div>
                <div class="window">
                    <div class="window-overlay"></div>
                    <div class="strip"></div>
                </div>
            `;
            
            const strip = container.querySelector(".strip");
            const overlay = container.querySelector(".window-overlay");
            const win = container.querySelector(".window");
            const lockBtn = container.querySelector(".lock-toggle");

            // Build the massive repeating strip
            for(let c=0; c < COPIES; c++) {
                deck.values.forEach(v => {
                    const card = document.createElement("div");
                    card.className = "card";
                    card.innerText = v;
                    strip.appendChild(card);
                });
            }

            const startIdx = Math.floor(Math.random() * deck.values.length);
            els.reelBank.appendChild(container);
            
            let locked = false;
            lockBtn.onclick = () => {
                locked = !locked;
                lockBtn.innerText = locked ? "LOCKED" : "UNLOCK";
                lockBtn.classList.toggle("active", locked);
            };

            setTimeout(() => {
                const h = win.offsetHeight;
                strip.style.transform = `translateY(${- (MID_COPY * deck.values.length + startIdx) * h}px)`;
            }, 50);

            state.reels.push({ 
                strip, 
                overlay, 
                win, 
                currentIndex: startIdx, 
                len: deck.values.length, 
                direction: i % 2 === 0 ? 1 : -1, 
                isLocked: () => locked 
            });
        });
    }

    async function spin() {
        if (state.spinning) return;
        state.spinning = true;

        state.reels.forEach(r => {
            if (!r.isLocked()) r.overlay.style.opacity = "0";
        });

        const tasks = state.reels.map((r, i) => {
            if (r.isLocked()) return Promise.resolve();

            const h = r.win.offsetHeight;
            const endIdx = Math.floor(Math.random() * r.len);
            
            // Define how many "full decks" we cycle through
            const cycles = 15 + (i * 4); // Staggered cycle count for staggered stops
            const travel = r.direction * (cycles * r.len + ((endIdx - r.currentIndex + r.len) % r.len));
            const duration = 2500 + (i * 800); 

            r.strip.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0, 0.1, 1)`;
            const finalPos = (MID_COPY * r.len + r.currentIndex) + travel;
            r.strip.style.transform = `translateY(${-finalPos * h}px)`;

            return new Promise(resolve => {
                setTimeout(() => {
                    r.overlay.style.opacity = "1";
                    
                    // REEL RESET: Snap back to the MID_COPY silently so the next spin has infinite cards again
                    r.strip.style.transition = "none";
                    r.strip.style.transform = `translateY(${- (MID_COPY * r.len + endIdx) * h}px)`;
                    r.currentIndex = endIdx;
                    resolve();
                }, duration);
            });
        });

        await Promise.all(tasks);
        state.spinning = false;
    }

    let startY = 0, angle = 0, dragging = false;
    els.lever.onpointerdown = e => { if(!state.spinning) { dragging = true; startY = e.clientY; els.lever.setPointerCapture(e.pointerId); }};
    els.lever.onpointermove = e => { if(dragging) { angle = Math.min(60, Math.max(0, (e.clientY - startY) * 0.8)); els.lever.style.transform = `rotate(${angle}deg)`; }};
    els.lever.onpointerup = () => { if(dragging) { if(angle >= LEVER_TRIGGER) spin(); dragging = false; els.lever.style.transform = `rotate(0deg)`; }};

    els.spinBtn.onclick = spin;
    build();
    window.addEventListener('resize', build);
})();