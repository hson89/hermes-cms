import { getPayload } from 'payload'
import config from '../payload.config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const AURELIAN_HTML = `<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>AURELIAN | Cinematic Automotive Retail</title>
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<!-- Material Symbols -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,100..900;1,100..900&amp;family=Noto+Serif:ital,wght@0,100..900;1,100..900&amp;display=swap" rel="stylesheet"/>
<style>
        .material-symbols-outlined {
            font-family: 'Material Symbols Outlined';
            font-weight: normal;
            font-style: normal;
            font-size: 24px;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            display: inline-block;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
            -webkit-font-feature-settings: 'liga';
            -webkit-font-smoothing: antialiased;
        }
        
        /* Base easing */
        :root {
            --easing-fluid: cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* Subtle micro-shadows for cards */
        .card-shadow {
            box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.15);
            transition: transform 0.6s var(--easing-fluid), box-shadow 0.6s var(--easing-fluid);
        }
        .card-shadow:hover {
            transform: translateY(-8px) scale(1.01);
            box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.25);
        }

        /* Hero Animations */
        .hero-img-zoom {
            animation: kenBurns 20s ease-in-out infinite alternate;
        }
        @keyframes kenBurns {
            0% { transform: scale(1.05); }
            100% { transform: scale(1.15); }
        }

        .hero-headline-enter {
            opacity: 0;
            transform: translateY(40px);
            animation: slideUpFade 1.2s var(--easing-fluid) forwards;
            animation-delay: 0.3s;
        }
        .hero-sub-enter {
            opacity: 0;
            transform: translateY(30px);
            animation: slideUpFade 1.2s var(--easing-fluid) forwards;
            animation-delay: 0.6s;
        }

        @keyframes slideUpFade {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Scroll Reveals */
        .reveal-up {
            opacity: 0;
            transform: translateY(50px);
            transition: all 1s var(--easing-fluid);
        }
        .reveal-up.is-revealed {
            opacity: 1;
            transform: translateY(0);
        }

        /* Nav Link Hover Underline */
        .nav-link-hover {
            position: relative;
            display: inline-block;
        }
        .nav-link-hover::after {
            content: '';
            position: absolute;
            width: 0;
            height: 2px;
            bottom: -4px;
            left: 50%;
            background-color: currentColor;
            transition: all 0.4s var(--easing-fluid);
            transform: translateX(-50%);
        }
        .nav-link-hover:hover::after {
            width: 100%;
        }

        /* Button Shimmer */
        .btn-shimmer {
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
        }
        .btn-shimmer::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 50%;
            height: 100%;
            background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);
            transform: skewX(-20deg);
            transition: all 0.7s ease;
        }
        .btn-shimmer:hover::before {
            left: 200%;
        }
        .btn-shimmer:hover {
            box-shadow: 0 0 20px rgba(0, 54, 134, 0.4);
        }

        /* Parallax container */
        .parallax-wrapper {
            overflow: hidden;
            position: relative;
        }
        .parallax-img {
            will-change: transform;
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
            .hero-img-zoom,
            .hero-headline-enter,
            .hero-sub-enter,
            .reveal-up,
            .card-shadow,
            .btn-shimmer::before,
            .nav-link-hover::after,
            .parallax-img {
                animation: none !important;
                transition: none !important;
                transform: none !important;
                opacity: 1 !important;
            }
            .card-shadow:hover {
                transform: none;
            }
        }
    </style>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-surface": "#1b1c1c",
                        "surface-container-highest": "#e4e2e2",
                        "surface": "#fbf9f8",
                        "secondary-fixed-dim": "#c8c6c5",
                        "secondary-fixed": "#e5e2e1",
                        "on-tertiary-fixed": "#1b1c1a",
                        "tertiary-fixed": "#e3e2df",
                        "on-primary-fixed": "#001946",
                        "primary-fixed-dim": "#b1c5ff",
                        "inverse-primary": "#b1c5ff",
                        "on-secondary": "#ffffff",
                        "primary": "#003686",
                        "error-container": "#ffdad6",
                        "surface-container": "#efeded",
                        "secondary-container": "#e2dfde",
                        "inverse-surface": "#303031",
                        "surface-bright": "#fbf9f8",
                        "on-primary": "#ffffff",
                        "on-secondary-fixed-variant": "#474746",
                        "on-background": "#1b1c1c",
                        "surface-variant": "#e4e2e2",
                        "surface-container-low": "#f5f3f3",
                        "on-primary-fixed-variant": "#00419e",
                        "on-error": "#ffffff",
                        "on-tertiary-fixed-variant": "#464744",
                        "background": "#fbf9f8",
                        "on-surface-variant": "#434653",
                        "primary-container": "#094cb2",
                        "on-tertiary-container": "#c6c5c2",
                        "secondary": "#5f5e5e",
                        "on-error-container": "#93000a",
                        "outline": "#737784",
                        "tertiary": "#3a3b39",
                        "tertiary-container": "#51524f",
                        "inverse-on-surface": "#f2f0f0",
                        "surface-container-lowest": "#ffffff",
                        "on-primary-container": "#b0c5ff",
                        "primary-fixed": "#dae2ff",
                        "surface-tint": "#2259bf",
                        "surface-dim": "#dbdad9",
                        "surface-container-high": "#e9e8e7",
                        "tertiary-fixed-dim": "#c7c7c3",
                        "on-tertiary": "#ffffff",
                        "on-secondary-fixed": "#1c1b1b",
                        "outline-variant": "#c3c6d5",
                        "on-secondary-container": "#636262",
                        "error": "#ba1a1a"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.125rem",
                        "lg": "0.25rem",
                        "xl": "0.5rem",
                        "full": "0.75rem"
                    },
                    "spacing": {
                        "unit": "8px",
                        "container-max": "1280px",
                        "margin-desktop": "64px",
                        "section-gap": "128px",
                        "margin-mobile": "24px",
                        "gutter": "32px"
                    },
                    "fontFamily": {
                        "headline-lg-mobile": ["Noto Serif"],
                        "label-md": ["Hanken Grotesk"],
                        "headline-lg": ["Noto Serif"],
                        "display-lg": ["Noto Serif"],
                        "body-lg": ["Hanken Grotesk"],
                        "headline-md": ["Noto Serif"],
                        "display-lg-mobile": ["Noto Serif"],
                        "caption": ["Hanken Grotesk"],
                        "body-md": ["Hanken Grotesk"]
                    },
                    "fontSize": {
                        "headline-lg-mobile": ["32px", { "lineHeight": "1.3", "fontWeight": "600" }],
                        "label-md": ["14px", { "lineHeight": "1.2", "letterSpacing": "0.05em", "fontWeight": "600" }],
                        "headline-lg": ["48px", { "lineHeight": "1.2", "fontWeight": "600" }],
                        "display-lg": ["64px", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                        "body-lg": ["20px", { "lineHeight": "1.6", "fontWeight": "400" }],
                        "headline-md": ["32px", { "lineHeight": "1.3", "fontWeight": "600" }],
                        "display-lg-mobile": ["40px", { "lineHeight": "1.2", "fontWeight": "700" }],
                        "caption": ["12px", { "lineHeight": "1.4", "fontWeight": "400" }],
                        "body-md": ["16px", { "lineHeight": "1.6", "fontWeight": "400" }]
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-surface text-on-surface antialiased overflow-x-hidden selection:bg-primary selection:text-on-primary">
<!-- TopNavBar -->
<nav class="docked full-width top-0 z-50 fixed bg-surface/95 backdrop-blur-sm w-full border-b border-outline-variant">
<div class="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop max-w-container mx-auto h-20">
<!-- Brand Logo -->
<a class="font-display-lg text-display-lg tracking-tighter text-on-surface" href="#">AURELIAN</a>
<!-- Navigation Links -->
<ul class="hidden md:flex space-x-12">
<li><a class="font-label-md text-label-md text-secondary nav-link-hover hover:text-primary transition-colors duration-300" href="#">Models</a></li>
<li><a class="font-label-md text-label-md text-primary nav-link-hover pb-2 opacity-80 transition-opacity" href="#">Discovery</a></li>
<li><a class="font-label-md text-label-md text-secondary nav-link-hover hover:text-primary transition-colors duration-300" href="#">Bespoke</a></li>
<li><a class="font-label-md text-label-md text-secondary nav-link-hover hover:text-primary transition-colors duration-300" href="#">Heritage</a></li>
<li><a class="font-label-md text-label-md text-secondary nav-link-hover hover:text-primary transition-colors duration-300" href="#">Journal</a></li>
</ul>
<!-- Trailing Actions & Search -->
<div class="flex items-center space-x-6">
<button aria-label="Search" class="text-on-surface hover:text-primary transition-colors flex items-center">
<span class="material-symbols-outlined" data-icon="search">search</span>
</button>
<button class="hidden md:inline-flex bg-on-surface text-surface px-8 py-3 font-label-md text-label-md btn-shimmer border border-on-surface hover:bg-primary hover:border-primary transition-colors duration-300">
                Inquiry
            </button>
<!-- Mobile Menu Toggle -->
<button class="md:hidden text-on-surface flex items-center">
<span class="material-symbols-outlined" data-icon="menu">menu</span>
</button>
</div>
</div>
</nav>
<main class="pt-20">
<!-- Cinematic Hero Section -->
<section class="relative w-full h-[870px] md:h-[921px] flex items-center justify-center overflow-hidden bg-on-surface">
<div class="absolute inset-0 z-0">
<img class="w-full h-full object-cover opacity-70 hero-img-zoom" data-alt="A cinematic, high-fashion style photograph of a sleek, modern luxury vehicle parked in a vast, minimalist concrete architectural space. The lighting is soft and diffused, emphasizing the pristine white and deep black contrasts of the Premium Minimalism aesthetic. The mood is serene, authoritative, and evocative of a high-end editorial spread." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8TFItxn5bgAyRZuJFDyCJGo1f45JYN2uTtJIY9hHlpDqA3ItX9VqhvUf0dud24FTjuzv2XLn4Jutr0wnQ1fR5LVdhQOKbC1x53mOeDihcY3JqH3S4TQGYu-s0l0NQbdLQW37jcBmEjGmuovPZeXzeva1ycMp2tOOZshmx9xSq60H_9jgxPqCAeVfPtmmaxzAvk8HhYW3zrKp4z2dmJPJeOjnde6RISD2Zy1rn2qZbzhcpM2xTLFd00_HzPgCd60-gHlFepCjIwlnA"/>
</div>
<div class="relative z-10 text-center px-6 max-w-4xl mx-auto flex flex-col items-center">
<span class="font-label-md text-label-md text-surface-container-high mb-6 tracking-[0.3em] uppercase hero-headline-enter">The Pursuit of Purity</span>
<h1 class="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-surface mb-8 drop-shadow-lg hero-headline-enter" style="animation-delay: 0.1s;">SCULPTED IN MOTION</h1>
<p class="font-body-lg text-body-lg text-surface-container-highest max-w-2xl drop-shadow-md opacity-90 hero-sub-enter">An uncompromising vision of automotive architecture. Discover the intersection of raw performance and curated silence.</p>
</div>
<div class="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center animate-bounce hero-sub-enter" style="animation-delay: 0.8s;">
<span class="font-label-md text-label-md text-surface uppercase tracking-widest text-[10px] mb-2 opacity-70">Scroll to Explore</span>
<span class="material-symbols-outlined text-surface opacity-70" data-icon="arrow_downward" data-weight="fill">arrow_downward</span>
</div>
</section>
<!-- Model Discovery Grid (Bento Style) -->
<section class="py-section-gap px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
<div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b border-outline pb-6 gap-6 reveal-up">
<div>
<span class="font-label-md text-label-md text-secondary block uppercase tracking-widest mb-2">Curated Collection</span>
<h2 class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface leading-tight">Masterpieces of<br/>Engineering</h2>
</div>
<a class="font-label-md text-label-md text-primary flex items-center gap-2 hover:underline group" href="#">
                View Complete Archive 
                <span class="material-symbols-outlined transform group-hover:translate-x-1 transition-transform" data-icon="east">east</span>
</a>
</div>
<div class="grid grid-cols-1 md:grid-cols-12 gap-gutter">
<!-- Primary Highlight Card -->
<article class="col-span-12 md:col-span-8 bg-surface-container-lowest p-6 card-shadow cursor-pointer group reveal-up" style="transition-delay: 0.1s;">
<div class="relative h-[400px] md:h-[600px] overflow-hidden mb-8">
<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" data-alt="A large, striking editorial photograph of a luxury sports car presented in a stark, bright studio environment. The light-mode aesthetic dominates with pure white backgrounds and deep black shadows highlighting the car's sleek curves. The composition is asymmetrical and modern, evoking a sense of high-end architectural design journals." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYWfgGXAnodzwAFQpy0--SjAwuxHukpksZfx-3TrXgro-OmbL2A9C-vG_amwRMQocdJDopMLlA83gfRey3VWHe56OPgAOfWJYnL3GXY6if9DicaSOo2zxsu9rDK-tsJ32t3cywv4GYH9N8YTL458NZ2pef9biKGDXZVwMR69I57MMHUvyhAjvtuVsilG2fK5lbpxgkmuwU_Sr08yGYYCujrM8fToHvqmrsgUB_1innr9XumJffoFjxE875MNXH2XYy3bxbcNbHHo_L"/>
<div class="absolute top-4 left-4 bg-on-surface/5 backdrop-blur px-3 py-1 rounded">
<span class="font-label-md text-label-md text-on-surface text-xs uppercase tracking-wider">Flagship</span>
</div>
</div>
<div class="flex flex-col md:flex-row justify-between items-start gap-4">
<div>
<h3 class="font-headline-md text-headline-md text-on-surface mb-3 group-hover:text-primary transition-colors">Aurelian Spectre V12</h3>
<p class="font-body-md text-body-md text-secondary max-w-lg">The absolute pinnacle of grand touring. A masterclass in aerodynamic efficiency wrapped in an unmistakable silhouette.</p>
</div>
<span class="font-headline-md text-headline-md text-outline font-light">01</span>
</div>
</article>
<!-- Secondary Stacked Cards -->
<div class="col-span-12 md:col-span-4 flex flex-col gap-gutter">
<!-- Feature Card -->
<article class="flex-1 bg-surface-container-lowest p-6 card-shadow cursor-pointer group reveal-up" style="transition-delay: 0.2s;">
<div class="relative h-[250px] overflow-hidden mb-6">
<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" data-alt="A close-up, highly detailed shot of the interior of a luxury vehicle, focusing on the premium leather stitching and polished metal accents. The lighting is crisp and cool, maintaining the bright, clean aesthetic of a modern design catalog. The colors are strictly constrained to blacks, whites, and metallic silvers." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDHrQCHlgc5pqbprOe0MT12O87uaiijYnSJdf8A0Azu8i1dxQA0lkbwcgO8b-5mO_oAtuq52Tdq3QUoLr1Ye8QQoJDi0A2Rnnze9WXlIKp_NpVGajQrtc3O0ytWswf826bigteflt28eaW0P6gm3hsmJWNZ3mNQpNMnjU8_enY0vXOvgJ85nCNiv3mKTXAtacHG1h9Q20yo1jjZBx_uO3m67NhkTKU0fI4OuDmd5Sw6w-G1RCo_aQD80_7NrPmiT0_yUrxQNTyw63y"/>
</div>
<h3 class="font-headline-md text-headline-md text-on-surface mb-2 text-2xl group-hover:text-primary transition-colors">Bespoke Interiors</h3>
<p class="font-body-md text-body-md text-secondary">Tactile perfection. Tailored exclusively to the individual's exacting standards.</p>
</article>
<!-- Call to Action Card -->
<div class="bg-surface-container-lowest p-8 card-shadow flex flex-col justify-center border-t-2 border-primary group reveal-up" style="transition-delay: 0.3s;">
<span class="material-symbols-outlined text-primary mb-4 text-4xl" data-icon="edit_document" data-weight="fill">edit_document</span>
<h3 class="font-headline-md text-headline-md text-on-surface mb-4 text-2xl">Commission Yours</h3>
<p class="font-body-md text-body-md text-secondary mb-8">Begin a dialogue with our master craftsmen to realize your unique vision.</p>
<button class="bg-primary text-on-primary font-label-md text-label-md py-4 px-6 btn-shimmer w-full text-center">
                        Start Configuration
                    </button>
</div>
</div>
</div>
</section>
<!-- Editorial Heritage Section -->
<section class="bg-surface-container-lowest py-section-gap border-y border-outline-variant relative overflow-hidden">
<!-- Decorative background element -->
<div class="absolute top-0 right-0 w-1/2 h-full bg-surface-container-low/50 -skew-x-12 transform origin-top-right z-0 hidden md:block"></div>
<div class="max-w-container mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 md:grid-cols-12 gap-gutter items-center relative z-10">
<div class="col-span-12 md:col-span-5 order-2 md:order-1 pr-0 md:pr-12 reveal-up">
<span class="font-label-md text-label-md text-secondary mb-6 block uppercase tracking-[0.2em]">The Archives</span>
<h2 class="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-8 leading-[1.1]">A Heritage of Velocity</h2>
<p class="font-body-lg text-body-lg text-secondary mb-10 leading-relaxed">
                    Since 1928, Aurelian has operated at the absolute intersection of aggressive engineering and high art. We do not merely construct vehicles; we sculpt singular experiences in aluminum, carbon, and light. Our historical commitment to the pure aesthetic of motion remains uncompromisingly intact.
                </p>
<a class="font-label-md text-label-md text-on-surface border-b border-on-surface pb-1 hover:text-primary hover:border-primary transition-colors inline-flex items-center gap-2 group" href="#">
                    Explore the Journal 
                    <span class="material-symbols-outlined text-[18px] transform group-hover:translate-x-2 transition-transform duration-300" data-icon="arrow_forward">arrow_forward</span>
</a>
</div>
<div class="col-span-12 md:col-span-7 order-1 md:order-2 relative h-[500px] md:h-[700px] w-full mb-10 md:mb-0 parallax-wrapper reveal-up" style="transition-delay: 0.2s;">
<img class="w-full h-full object-cover grayscale opacity-90 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] parallax-img scale-[1.1]" data-alt="A vintage, high-contrast black and white photograph of an early model luxury car in motion on a sweeping coastal road. The image has a grainy, cinematic quality reminiscent of mid-century fashion photography. It emphasizes the brand's long-standing heritage and commitment to timeless, minimalist design principles." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvCCYu0T0AQY5U-UvcWNyRvlbRkzZCt1LEg-oZdHb23TW4yYL92zKFDOD7LtW9rwYa0kC8s1obl_jwP5X-x1RAK7PtG6CEXM5cbvSXVdTiYfC3pjQokfoWtEAA6yUU7NB9vpR4WGWKdi4TMV3prkOquc6XFNdf3RYTsGbaJv8tKjQtw8suz9X1naDZHxI1ccdQGyJmQAwemJQ2EMrbNIqrhqcBVux08oQt6RD4uQ0Ur2rWUJ_wvAAGR2EbxgpHFhX55hDHS7OKVUbU"/>
<!-- Floating stat card -->
<div class="absolute -bottom-8 -left-8 md:bottom-12 md:-left-12 bg-surface p-8 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-outline-variant max-w-[250px] card-shadow reveal-up" style="transition-delay: 0.4s;">
<span class="font-display-lg text-display-lg text-on-surface block leading-none mb-2">95</span>
<span class="font-label-md text-label-md text-secondary uppercase tracking-wider text-xs block">Years of Uncompromising Design</span>
</div>
</div>
</div>
</section>
</main>
<!-- Footer -->
<footer class="full-width bottom bg-surface-container-low w-full border-t border-outline-variant">
<div class="grid grid-cols-1 md:grid-cols-2 gap-gutter w-full px-margin-mobile md:px-margin-desktop py-16 md:py-24 max-w-container mx-auto">
<!-- Brand & Copyright -->
<div class="flex flex-col gap-6 reveal-up">
<span class="font-headline-md text-headline-md italic text-on-surface tracking-tighter">AURELIAN</span>
<p class="font-caption text-caption text-secondary max-w-xs leading-relaxed">
                © 2024 AURELIAN AUTOMOTIVE GROUP. CRAFTED FOR THE DISCERNING.
            </p>
</div>
<!-- Navigation Links -->
<div class="flex flex-col md:items-end justify-between reveal-up" style="transition-delay: 0.1s;">
<div class="flex flex-wrap gap-x-8 gap-y-4 mb-12">
<a class="font-label-md text-label-md text-secondary hover:text-on-surface transition-colors duration-300" href="#">Legal</a>
<a class="font-label-md text-label-md text-secondary hover:text-on-surface transition-colors duration-300" href="#">Privacy</a>
<a class="font-label-md text-label-md text-secondary hover:text-on-surface transition-colors duration-300" href="#">Investors</a>
<a class="font-label-md text-label-md text-secondary hover:text-on-surface transition-colors duration-300" href="#">Sustainability</a>
<a class="font-label-md text-label-md text-secondary hover:text-on-surface transition-colors duration-300" href="#">Careers</a>
</div>
<div class="flex items-center gap-4">
<span class="font-label-md text-label-md text-secondary uppercase text-xs tracking-widest">Global Sites</span>
<select class="bg-transparent border-b border-outline text-on-surface font-label-md text-label-md py-1 pr-8 focus:ring-0 focus:border-primary focus:outline-none cursor-pointer transition-colors duration-300 hover:border-primary">
<option>United Kingdom</option>
<option>United States</option>
<option>Japan</option>
<option>Switzerland</option>
</select>
</div>
</div>
</div>
</footer>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        // Respect prefers-reduced-motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!prefersReducedMotion) {
            // Scroll Reveal functionality via IntersectionObserver
            const observerOptions = {
                root: null,
                rootMargin: '0px',
                threshold: 0.15
            };

            const revealObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-revealed');
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            document.querySelectorAll('.reveal-up').forEach(el => {
                revealObserver.observe(el);
            });

            // Parallax effect for specific images
            const parallaxImages = document.querySelectorAll('.parallax-img');
            
            window.addEventListener('scroll', () => {
                const scrollY = window.scrollY;
                
                parallaxImages.forEach(img => {
                    // Simple parallax calculation
                    const speed = 0.15;
                    // Find container top relative to document
                    const rect = img.closest('.parallax-wrapper').getBoundingClientRect();
                    const absoluteTop = rect.top + window.scrollY;
                    
                    // Only apply if in viewport approximately
                    if(rect.top < window.innerHeight && rect.bottom > 0) {
                        const yPos = (scrollY - absoluteTop + window.innerHeight/2) * speed;
                        img.style.transform = 'translateY(' + yPos + 'px) scale(1.1)';
                    }
                });
            }, { passive: true });
        }
    });
</script>
</body></html>`

async function seed() {
  console.log('Initializing Payload...')
  const payload = await getPayload({ config: await config })
  console.log('Payload initialized.')

  try {
    // Check if the default template already exists
    console.log('Checking if default template is already seeded...')
    const templateCheck = await payload.find({
      collection: 'page-templates' as any,
      where: {
        slug: {
          equals: 'aurelian-spectre-v12',
        },
        isGlobal: {
          equals: true,
        },
      },
      limit: 1,
    } as any)

    if (templateCheck.docs && templateCheck.docs.length > 0) {
      console.log('Default template "aurelian-spectre-v12" already exists. Seeding skipped.')
      return
    }

    // 1. Resolve or Create Super Admin user
    console.log('Checking for Super Admin user...')
    const userSearch = await payload.find({
      collection: 'users',
      where: {
        role: {
          equals: 'super-admin',
        },
      },
      limit: 1,
    })

    let adminUser = userSearch.docs[0]

    if (!adminUser) {
      console.log('No super-admin user found. Creating a root tenant and super-admin...')
      
      const tenantSearch = await payload.find({
        collection: 'tenants',
        where: {
          slug: {
            equals: 'root',
          },
        },
        limit: 1,
      })

      let tenant = tenantSearch.docs[0]
      if (!tenant) {
        tenant = await payload.create({
          collection: 'tenants',
          data: {
            name: 'Hermes Root',
            slug: 'root',
            status: 'active',
            tier: 'standard',
            defaultLocale: 'en',
            domains: [
              {
                hostname: 'localhost.hermes-cms.com',
                isPrimary: true,
              },
            ],
          },
          overrideAccess: true,
        })
        console.log(`Created root tenant: ${tenant.id}`)
      }

      adminUser = await payload.create({
        collection: 'users',
        data: {
          email: 'admin@hermes-ai.com',
          password: 'password123',
          name: 'Super Admin',
          role: 'super-admin',
          tenants: [
            {
              tenant: tenant.id,
            },
          ],
        },
        overrideAccess: true,
      })
      console.log(`Created super-admin user: ${adminUser.id}`)
    } else {
      console.log(`Found existing super-admin: ${adminUser.email} (ID: ${adminUser.id})`)
    }

    // 2. Create/Update Global Content Type: Automotive Specifications
    console.log('Creating/updating Global Content Type: Automotive Specifications...')
    const ctSearch = await payload.find({
      collection: 'content-types',
      where: {
        slug: {
          equals: 'automotive-specifications',
        },
        isGlobal: {
          equals: true,
        },
      },
      limit: 1,
    })

    const ctData = {
      name: 'Automotive Specifications',
      slug: 'automotive-specifications',
      status: 'published' as const,
      isGlobal: true,
      tenant: null,
      schema: {
        fields: [
          { name: 'title', label: 'Title', type: 'text', required: true, unique: true },
          { name: 'slug', label: 'Slug', type: 'text', required: true, unique: true },
          { name: 'brand', label: 'Brand Name', type: 'text', required: true },
          { name: 'model', label: 'Model Name', type: 'text', required: true },
          { name: 'engine', label: 'Engine Specifications', type: 'text', required: true },
          { name: 'horsepower', label: 'Horsepower (HP)', type: 'number', required: true },
          { name: 'acceleration', label: '0-60 mph (sec)', type: 'text', required: true },
          { name: 'topSpeed', label: 'Top Speed (mph)', type: 'number', required: true },
          { name: 'price', label: 'Starting Price (USD)', type: 'number', required: true },
          { name: 'description', label: 'Description', type: 'textarea', required: false },
        ],
      },
    }

    let contentTypeId: string | number

    if (ctSearch.docs.length > 0) {
      const existingCt = ctSearch.docs[0]
      console.log(`Global Content Type already exists (ID: ${existingCt.id}). Updating schema...`)
      const updatedCt = (await payload.update({
        collection: 'content-types',
        id: existingCt.id,
        data: ctData,
        overrideAccess: true,
      } as any)) as any
      contentTypeId = updatedCt.id
      console.log(`Global Content Type updated successfully!`)
    } else {
      const newCt = (await payload.create({
        collection: 'content-types',
        data: ctData,
        overrideAccess: true,
      } as any)) as any
      contentTypeId = newCt.id
      console.log(`Global Content Type created successfully! ID: ${contentTypeId}`)
    }

    // 3. Upload Premium Cinematic Automotive Thumbnail
    console.log('Uploading Premium Cinematic Automotive Thumbnail to Media collection...')
    const thumbnailPath = path.resolve(dirname, 'aurelian_thumbnail.png')
    let mediaDocId: string | number | null = null

    if (fs.existsSync(thumbnailPath)) {
      const imageBuffer = fs.readFileSync(thumbnailPath)
      
      const mediaSearch = await payload.find({
        collection: 'media',
        where: {
          alt: {
            equals: 'Aurelian Spectre V12 Premium Showcase',
          },
        },
        limit: 1,
      } as any)

      if (mediaSearch.docs.length > 0) {
        console.log(`Existing media thumbnail document found. Using ID: ${mediaSearch.docs[0].id}`)
        mediaDocId = mediaSearch.docs[0].id
      } else {
        const mediaDoc = (await payload.create({
          collection: 'media',
          data: {
            alt: 'Aurelian Spectre V12 Premium Showcase',
            tenant: null,
          },
          file: {
            data: imageBuffer,
            name: 'aurelian_thumbnail.png',
            mimetype: 'image/png',
            size: imageBuffer.byteLength,
          },
          overrideAccess: true,
        } as any)) as any
        mediaDocId = mediaDoc.id
        console.log(`Media uploaded successfully! ID: ${mediaDocId}`)
      }
    } else {
      console.warn(`Warning: Seeding thumbnail was not found at ${thumbnailPath}. Skipping upload step.`)
    }

    // 4. Create/Update Global Page Template: Aurelian Spectre V12
    console.log('Creating/updating Global Page Template: Aurelian Spectre V12...')
    const templateSearch = await payload.find({
      collection: 'page-templates' as any,
      where: {
        slug: {
          equals: 'aurelian-spectre-v12',
        },
        isGlobal: {
          equals: true,
        },
      },
      limit: 1,
    } as any)

    const templateData = {
      name: 'Aurelian Spectre V12',
      description: 'Cinematic luxury automotive showcase and specifications landing page template',
      slug: 'aurelian-spectre-v12',
      isGlobal: true,
      tenant: null,
      contentType: contentTypeId,
      archetype: 'landing' as const,
      status: 'active' as const,
      htmlContent: AURELIAN_HTML,
      image: mediaDocId || undefined,
      createdBy: adminUser.id,
    }

    if (templateSearch.docs.length > 0) {
      const existingTemplate = templateSearch.docs[0]
      console.log(`Global Page Template already exists (ID: ${existingTemplate.id}). Updating HTML and details...`)
      await payload.update({
        collection: 'page-templates' as any,
        id: existingTemplate.id,
        data: templateData,
        overrideAccess: true,
      } as any)
      console.log(`Global Page Template updated successfully!`)
    } else {
      const newTemplate = (await payload.create({
        collection: 'page-templates' as any,
        data: templateData,
        overrideAccess: true,
      } as any)) as any
      console.log(`Global Page Template created successfully! ID: ${newTemplate.id}`)
    }

    console.log('--- SEEDING SYSTEM SUCESSFULLY COMPLETE ---')
  } catch (err) {
    console.error('Seeding failed with error:', err)
    throw err
  }
}

seed()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal execution error:', err)
    process.exit(1)
  })
