/* bonfire.thecrossroads.workers.dev: Bonfire Ice Breaker, the get-to-know-you game for up to 40 people.
   The pages are built by huddle/build.py into static/bonfire/. The relay itself is shared: see relay.js. */
import { site, Room, Gate } from "./relay.js";
import phone from "../static/bonfire/phone.html";
import tv from "../static/bonfire/tv.html";

export default site({ phone, tv, games: ["bonfire"] });
export { Room, Gate };
