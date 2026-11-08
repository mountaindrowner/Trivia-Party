/* sparkwars.thecrossroads.workers.dev: Spark Wars, the 30-player youth group game.
   The pages are built by huddle/build.py into static/spark/. The relay itself is shared: see relay.js. */
import { site, Room, Gate } from "./relay.js";
import phone from "../static/spark/phone.html";
import tv from "../static/spark/tv.html";
// Files bundled in by huddle/build.py: Barnabas's recorded lines (/voice/clips/*.mp3), the app icons and the web app
// manifest (so an iPhone can open the TV page full screen from its home screen).
import bundled from "../static/spark/files.js";

const TYPES = { mp3: "audio/mpeg", png: "image/png", webmanifest: "application/manifest+json" };
const files = Object.fromEntries(Object.entries(bundled).map(([path, body]) => [path, { body, type: TYPES[path.split(".").pop()] }]));
export default site({ phone, tv, games: ["spark-wars"], files });
export { Room, Gate };
