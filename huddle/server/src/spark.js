/* sparkwars.thecrossroads.workers.dev: Spark Wars, the 30-player youth group game.
   The pages are built by huddle/build.py into static/spark/. The relay itself is shared: see relay.js. */
import { site, Room, Gate } from "./relay.js";
import phone from "../static/spark/phone.html";
import tv from "../static/spark/tv.html";

export default site({ phone, tv, games: ["spark-wars"] });
export { Room, Gate };
