const CACHE = "dinner-lottery-nutrition-20261028-v2";
const DISH_IMAGES = [
  "./assets/dishes/blanched-shrimp.webp",
  "./assets/dishes/bream-tofu-stew.webp",
  "./assets/dishes/razor-clam-egg.svg",
  "./assets/dishes/scallion-steamed-chicken.svg",
  "./assets/dishes/scallion-mandarin-fish.webp",
  "./assets/dishes/pan-red-shrimp.webp",
  "./assets/dishes/butter-shrimp.webp",
  "./assets/dishes/mixed-grilled-fish.svg",
  "./assets/dishes/mustard-butter-prawns.webp",
  "./assets/dishes/carp-cabbage-stew.webp",
  "./assets/dishes/steamed-sea-bass.webp",
  "./assets/dishes/garlic-shrimp.webp",
  "./assets/dishes/tomato-shrimp.svg",
  "./assets/dishes/sweet-sour-carp.svg",
  "./assets/dishes/pan-crispy-fish.webp",
  "./assets/dishes/tomato-fish.svg",
  "./assets/dishes/yangshuo-beer-fish.webp",
  "./assets/dishes/braised-prawns.webp",
  "./assets/dishes/pakistani-beef-curry.webp",
  "./assets/dishes/winter-melon-stuffed-pork.svg",
  "./assets/dishes/shrimp-steamed-tofu.svg",
  "./assets/dishes/dry-fried-chicken.webp",
  "./assets/dishes/kung-pao-chicken.webp",
  "./assets/dishes/radish-beef-brisket.webp",
  "./assets/dishes/black-pepper-beef.webp",
  "./assets/dishes/ginger-chicken.webp",
  "./assets/dishes/braised-beef.webp",
  "./assets/dishes/sauce-pork-ribs.webp",
  "./assets/dishes/jiao-bai-pork.webp",
  "./assets/dishes/air-fry-chicken.webp",
  "./assets/dishes/mouthwatering-chicken.webp",
  "./assets/dishes/chilled-shredded-chicken.webp",
  "./assets/dishes/five-spice-beef.webp",
  "./assets/dishes/mapo-tofu.webp",
  "./assets/dishes/steak.webp",
  "./assets/dishes/beer-duck.webp",
  "./assets/dishes/stuffed-green-pepper.svg",
  "./assets/dishes/pepper-potato-pork.webp",
  "./assets/dishes/steamed-mandarin-fish.webp",
  "./assets/dishes/lean-pork-potato.webp",
  "./assets/dishes/boiled-beef.webp",
  "./assets/dishes/winter-melon-rib-soup.svg",
  "./assets/dishes/tomato-potato-beef.webp",
  "./assets/dishes/pumpkin-steamed-chicken.svg",
  "./assets/dishes/yellow-beef-stirfry.webp",
  "./assets/dishes/chicken-liver-stirfry.webp",
  "./assets/dishes/xinjiang-chicken.webp",
  "./assets/dishes/chu-hou-beef-brisket.webp",
  "./assets/dishes/zibo-bbq.webp",
  "./assets/dishes/spinach-eggs.webp",
  "./assets/dishes/cabbage-eggs-noodles.webp",
  "./assets/dishes/zucchini-eggs.webp",
  "./assets/dishes/onion-eggs.webp",
  "./assets/dishes/steamed-egg.svg",
  "./assets/dishes/olive-bean-mince.webp",
  "./assets/dishes/yellow-catfish-tofu-soup.webp",
  "./assets/dishes/tangerine-peel-rib-soup.webp",
  "./assets/dishes/lamb-soup.webp",
  "./assets/dishes/corn-rib-soup.webp",
  "./assets/dishes/tomato-shrimp-tofu-soup.svg",
  "./assets/dishes/scallion-sea-cucumber.webp",
  "./assets/dishes/butter-garlic-shrimp.webp",
  "./assets/dishes/crayfish.webp",
  "./assets/dishes/black-bean-dace-greens.webp",
  "./assets/dishes/potato-pork-ribs.webp",
  "./assets/dishes/xiangqi-rice-duck.webp",
  "./assets/dishes/egg-drop-soup.webp"
];

const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./app.js?v=20261028",
  "./src/recipes.js",
  "./src/recipes.js?v=20261028",
  "./src/state.js",
  "./src/state.js?v=20261028",
  "./src/share-card.js",
  "./manifest.webmanifest",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  const dishImages = DISH_IMAGES;
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([...CORE, ...dishImages]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }),
    ),
  );
});
