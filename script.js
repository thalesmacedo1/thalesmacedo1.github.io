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

// translations: English is read from the page, other languages come from i18n.js
const LANGS = ["en", "pt", "de"];
const HTML_LANG = { en: "en", pt: "pt-BR", de: "de" };
const metaDesc = document.querySelector('meta[name="description"]');
let currentLang = "en";

document.querySelectorAll("[data-i18n]").forEach((el) => (el.dataset.en = el.innerHTML));
document.querySelectorAll("[data-i18n-aria]").forEach((el) => (el.dataset.enAria = el.getAttribute("aria-label")));
metaDesc.dataset.en = metaDesc.content;


function setLang(lang) {
    currentLang = LANGS.includes(lang) ? lang : "en";
    const dict = I18N[currentLang] || {};
    const english = currentLang === "en";

    document.documentElement.lang = HTML_LANG[currentLang];
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        el.innerHTML = english ? el.dataset.en : dict[el.dataset.i18n] ?? el.dataset.en;
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
        el.setAttribute("aria-label", english ? el.dataset.enAria : dict[el.dataset.i18nAria] ?? el.dataset.enAria);
    });
    metaDesc.content = english ? metaDesc.dataset.en : dict["meta.desc"] ?? metaDesc.dataset.en;

    document.querySelectorAll(".lang-switch button").forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.lang === currentLang)
    );

    try {
        localStorage.setItem("lang", currentLang);
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set("lang", currentLang);
    history.replaceState(null, "", url);
}

function initialLang() {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (LANGS.includes(fromUrl)) return fromUrl;
    try {
        const saved = localStorage.getItem("lang");
        if (LANGS.includes(saved)) return saved;
    } catch {}
    const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
    return LANGS.includes(browser) ? browser : "en";
}

document.querySelectorAll(".lang-switch button").forEach((b) =>
    b.addEventListener("click", () => setLang(b.dataset.lang))
);

setLang(initialLang());
