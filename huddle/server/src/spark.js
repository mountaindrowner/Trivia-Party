/* sparkwars.thecrossroads.workers.dev: Spark Wars, the 30-player youth group game.
   The pages are built by huddle/build.py into static/spark/. The relay itself is shared: see relay.js. */
import { site, Room, Gate } from "./relay.js";
import phone from "../static/spark/phone.html";
import tv from "../static/spark/tv.html";
// Barnabas's recorded lines, bundled in (built by huddle/build.py): { "/voice/clips/name.mp3": ArrayBuffer }.
import clips from "../static/spark/clips.js";

const files = Object.fromEntries(Object.entries(clips).map(([path, body]) => [path, { body, type: "audio/mpeg" }]));
export default site({ phone, tv, games: ["spark-wars"], files });
export { Room, Gate };
