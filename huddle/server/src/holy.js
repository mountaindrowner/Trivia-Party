/* holyhuddle.thecrossroads.workers.dev: Holy Huddle, the phone party game inside Trivia Holy Party.
   The pages are built by huddle/build.py into static/holy/. The relay itself is shared: see relay.js. */
import { site, Room, Gate } from "./relay.js";
import phone from "../static/holy/phone.html";
import tv from "../static/holy/tv.html";

export default site({ phone, tv, games: ["holy-trivia"] });
export { Room, Gate };
