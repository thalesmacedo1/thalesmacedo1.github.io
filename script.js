const GITHUB_USER = "thalesmacedo1";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// starfield background: twinkling stars, slight scroll parallax and the odd shooting star
(function starfield() {
    const canvas = document.getElementById("sky");
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const colors = ["#ffffff", "#dfe5ff", "#c3d0ff", "#ffe9c4"];
    let stars = [];
    let shooting = null;
    let width, height;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = Math.round((width * height) / 3200);
        stars = Array.from({ length: count }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.3 + 0.2,
            depth: Math.random() * 0.6 + 0.1,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.02 + 0.005,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        const scroll = window.scrollY;

        for (const s of stars) {
            s.phase += s.speed;
            const alpha = 0.45 + Math.sin(s.phase) * 0.35;
            const y = (((s.y - scroll * s.depth * 0.3) % height) + height) % height;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }

        if (!reduceMotion && !shooting && Math.random() < 0.004) {
            shooting = {
                x: Math.random() * width * 0.8 + width * 0.2,
                y: Math.random() * height * 0.4,
                len: Math.random() * 80 + 60,
                life: 0,
            };
        }

        if (shooting) {
            shooting.life += 1;
            const t = shooting.life;
            const x = shooting.x - t * 9;
            const y = shooting.y + t * 4;
            const grad = ctx.createLinearGradient(x, y, x + shooting.len, y - shooting.len * 0.45);
            grad.addColorStop(0, "rgba(255,255,255,0.9)");
            grad.addColorStop(1, "rgba(255,255,255,0)");
            ctx.globalAlpha = Math.max(0, 1 - t / 45);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + shooting.len, y - shooting.len * 0.45);
            ctx.stroke();
            if (t > 45) shooting = null;
        }

        ctx.globalAlpha = 1;
        if (!reduceMotion) requestAnimationFrame(draw);
    }

    window.addEventListener("resize", () => {
        resize();
        if (reduceMotion) draw();
    });
    if (reduceMotion) window.addEventListener("scroll", draw, { passive: true });

    resize();
    draw();
})();

// mobile menu
const nav = document.querySelector(".nav");
const toggle = document.querySelector(".nav-toggle");

toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
});

document.querySelectorAll("#nav-links a").forEach((link) =>
    link.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
    })
);

// highlight the current section in the nav
const navLinks = [...document.querySelectorAll("#nav-links a")];
const sectionObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            navLinks.forEach((a) =>
                a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`)
            );
        });
    },
    { rootMargin: "-45% 0px -50% 0px" }
);
document.querySelectorAll("main section[id]").forEach((s) => sectionObserver.observe(s));

// fade sections in on scroll
const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                revealObserver.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.1 }
);
document.querySelectorAll(".section").forEach((el) => {
    el.classList.add("reveal");
    revealObserver.observe(el);
});

document.getElementById("year").textContent = new Date().getFullYear();

// load public repositories from GitHub
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

async function loadRepos() {
    const grid = document.getElementById("repo-grid");
    try {
        const res = await fetch(
            `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=30`
        );
        if (!res.ok) throw new Error(res.status);
        const repos = (await res.json())
            .filter((r) => !r.fork && r.name !== `${GITHUB_USER}.github.io`)
            .slice(0, 6);

        if (!repos.length) {
            grid.innerHTML = '<p class="muted">No public repositories yet.</p>';
            return;
        }

        grid.innerHTML = repos
            .map(
                (r) => `
            <a class="repo-card" href="${r.html_url}" target="_blank" rel="noopener">
                <h3>${escapeHtml(r.name)}</h3>
                <p>${escapeHtml(r.description || "No description provided.")}</p>
                <div class="repo-meta">
                    ${r.language ? `<span class="lang">${escapeHtml(r.language)}</span>` : ""}
                    <span>★ ${r.stargazers_count}</span>
                </div>
            </a>`
            )
            .join("");
    } catch {
        grid.innerHTML =
            '<p class="muted">Couldn\'t load repositories right now. Check them out on GitHub.</p>';
    }
}

loadRepos();
