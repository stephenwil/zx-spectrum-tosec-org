import { ensureDir, exists, type WalkEntry } from "@std/fs";

import { expandGlob } from "@std/fs/expand-glob";
import { copy } from "@std/fs/copy";

const baseFolder = "./THESPECTRUM";
const gamesFolder = "./Games";
const gamesFolderZip = "./Games.zip";

const romUrls = [
  "https://github.com/rastersoft/fbzx/raw/refs/heads/master/data/spectrum-roms/128-0.rom",
  "https://github.com/rastersoft/fbzx/raw/refs/heads/master/data/spectrum-roms/128-1.rom",
  "https://github.com/rastersoft/fbzx/raw/refs/heads/master/data/spectrum-roms/48.rom",
  "https://github.com/rastersoft/fbzx/raw/refs/heads/master/data/spectrum-roms/plus3-0.rom",
  "https://github.com/rastersoft/fbzx/raw/refs/heads/master/data/spectrum-roms/plus3-1.rom",
  "https://github.com/rastersoft/fbzx/raw/refs/heads/master/data/spectrum-roms/plus3-2.rom",
  "https://github.com/rastersoft/fbzx/raw/refs/heads/master/data/spectrum-roms/plus3-3.rom",
];

const setup = async () => {
  await ensureDir(`./${baseFolder}`);
};

const fetchRoms = async () => {
  console.log("Fetching ROMS");

  await ensureDir(`./${baseFolder}/roms`);
  for (const romUrl of romUrls) {
    const fileResponse = await fetch(romUrl);

    if (fileResponse.body) {
      const filename = romUrl.split("/").pop();
      console.log(filename);
      const file = await Deno.open(`${baseFolder}/roms/${filename}`, {
        write: true,
        create: true,
      });
      await fileResponse.body.pipeTo(file.writable);
    }
  }
};

const parseGames = async () => {
  console.log("Parsing Games folder");

  if (await exists(gamesFolder) === false) {
    console.error("Games folder is not present");
    throw ("No Games folder");
  }

  if (await exists(gamesFolder) === false && await exists(gamesFolderZip)) {
    console.error("Games zip found, you need to unzip");
    throw ("Games zip only found");
  }

  const alphabet = Array.from(
    { length: 26 },
    (_, i) => String.fromCharCode(97 + i),
  );

  const numbers = Array.from(
    { length: 10 },
    (_, i) => String.fromCharCode(48 + i),
  );

  const alphanumeric = [...numbers, ...alphabet];

  function sliceIntoChunks(arr: WalkEntry[], chunkSize: number) {
    const res = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      const chunk = arr.slice(i, i + chunkSize);
      res.push(chunk);
    }
    return res;
  }

  for (const startingLetter of alphanumeric) {
    console.log(`Processing Folder starting with "${startingLetter}"`);

    const arr = await Array.fromAsync(
      expandGlob(startingLetter + "*", {
        root: gamesFolder,
        caseInsensitive: true,
      }),
    );
    const gamesStartingWith = arr.filter((g) => g.isDirectory === true);
    const sliced = sliceIntoChunks(gamesStartingWith, 256);

    console.log(
      `Found ${gamesStartingWith.length} starting with "${startingLetter.toUpperCase()}": ${sliced.length} chunk(s)`,
    );

    let index = 0;
    for (const slice of sliced) {
      console.log(
        `Letter "${startingLetter.toUpperCase()}", chunk ${index + 1}...`,
      );

      const dir = `${baseFolder}/${startingLetter.toUpperCase()}00${index}/`;

      await ensureDir(dir);
      await slice.forEach(async (game: WalkEntry) => {
        if (game.isDirectory) {
          const dirname = game.path.split("\\").pop();
          await copy(game.path, `${dir}/${dirname}/`, { overwrite: true });
        }
      });
      index++;
    }
  }
};

await setup();
await fetchRoms();
await parseGames();
