// Generates every narration line ahead of recording (needs the local stack Soynade is reached through).
import { voiceLine } from "./common.mjs";
import { INTRO, OUTRO, SAY } from "./narration.mjs";
import { audioDuration } from "../getting-started/tuto.mjs";

let total = 0;
for (const text of [INTRO, ...Object.values(SAY), OUTRO]) {
    const seconds = audioDuration(await voiceLine(text));
    total += seconds;
    console.log(`${seconds.toFixed(1)} s  ${text}`);
}
console.log(`total narration: ${total.toFixed(0)} s`);
