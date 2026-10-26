const CACHE = "dinner-lottery-v9";
const DISH_IDS = [
  "blanched-shrimp",
  "bream-tofu-stew",
  "razor-clam-egg",
  "scallion-sea-cucumber",
  "scallion-mandarin-fish",
  "pan-red-shrimp",
  "butter-shrimp",
  "mixed-grilled-fish",
  "mustard-butter-prawns",
  "carp-cabbage-stew",
  "steamed-sea-bass",
  "garlic-shrimp",
  "butter-garlic-shrimp",
  "sweet-sour-carp",
  "pan-crispy-fish",
  "crayfish",
  "yangshuo-beer-fish",
  "braised-prawns",
  "pakistani-beef-curry",
  "winter-melon-stuffed-pork",
  "black-bean-dace-greens",
  "dry-fried-chicken",
  "kung-pao-chicken",
  "radish-beef-brisket",
  "black-pepper-beef",
  "ginger-chicken",
  "braised-beef",
  "sauce-pork-ribs",
  "jiao-bai-pork",
  "air-fry-chicken",
  "mouthwatering-chicken",
  "chilled-shredded-chicken",
  "five-spice-beef",
  "mapo-tofu",
  "steak",
  "beer-duck",
  "stuffed-green-pepper",
  "pepper-potato-pork",
  "steamed-mandarin-fish",
  "lean-pork-potato",
  "boiled-beef",
  "potato-pork-ribs",
  "tomato-potato-beef",
  "xiangqi-rice-duck",
  "yellow-beef-stirfry",
  "chicken-liver-stirfry",
  "xinjiang-chicken",
  "chu-hou-beef-brisket",
  "zibo-bbq",
  "spinach-eggs",
  "cabbage-eggs-noodles",
  "zucchini-eggs",
  "onion-eggs",
  "steamed-egg",
  "olive-bean-mince",
  "yellow-catfish-tofu-soup",
  "tangerine-peel-rib-soup",
  "lamb-soup",
  "corn-rib-soup",
  "egg-drop-soup",
];

const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./src/recipes.js",
  "./src/state.js",
  "./manifest.webmanifest",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  const dishImages = DISH_IDS.map((id) => `./assets/dishes/${id}.webp`);
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
