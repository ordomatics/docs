// Generates every narration line ahead of recording, so takes cost nothing and
// the local stack Soynade is reached through can be stopped before filming.
import { voiceLine } from "./common.mjs";
import { INTRO, OUTRO, SAY } from "./narration.mjs";
import { audioDuration } from "./tuto.mjs";

let total = 0;
for (const text of [INTRO, ...Object.values(SAY), OUTRO]) {
    const file = await voiceLine(text);
    const seconds = audioDuration(file);
    total += seconds;
    console.log(`${seconds.toFixed(1)} s  ${text}`);
}
console.log(`total narration: ${total.toFixed(0)} s`);
