/* bonfire.thecrossroads.workers.dev: Bonfire Ice Breaker, the get-to-know-you game for up to 40 people, and Lights
   Out (/night), one night of wolves at camp for 3 to 12, run from the host's phone. The pages are built by
   huddle/build.py into static/bonfire/. The relay itself is shared: see relay.js. */
import { site, Room, Gate } from "./relay.js";
import phone from "../static/bonfire/phone.html";
import tv from "../static/bonfire/tv.html";
import night from "../static/bonfire/night.html";

export default site({ phone, tv, pages: { "/night": night }, games: ["bonfire", "lights-out"] });
export { Room, Gate };
