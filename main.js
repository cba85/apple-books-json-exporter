import fs from "fs/promises";
import Db from "better-sqlite3";

const BOOKS_DATABASE_DIRECTORY = `${process.env.HOME}/Library/Containers/com.apple.iBooksX/Data/Documents/BKLibrary`;
const ANNOTATIONS_DATABASE_DIRECTORY = `${process.env.HOME}/Library/Containers/com.apple.iBooksX/Data/Documents/AEAnnotation`;

let booksDatabaseFile = "";
let annotationsDatabaseFile = "";

const getDatabaseFile = async (directory) => {
  let databaseFile;

  const files = await fs.readdir(directory);

  for (const file of files) {
    const fileFragments = file.split(".");
    const suffix = fileFragments.pop();

    if (suffix == "sqlite") {
      databaseFile = `${directory}/${file}`;
    }
  }

  return databaseFile;
};

(async () => {
  booksDatabaseFile = await getDatabaseFile(BOOKS_DATABASE_DIRECTORY);
  annotationsDatabaseFile = await getDatabaseFile(
    ANNOTATIONS_DATABASE_DIRECTORY
  );

  const dbBooks = new Db(booksDatabaseFile);
  const books = dbBooks
    .prepare(
      `SELECT
      ZASSETID as id, ZTITLE AS title, ZAUTHOR AS author, ZLANGUAGE as language, ZPATH as path
      FROM ZBKLIBRARYASSET
      WHERE ZTITLE IS NOT NULL`
    )
    .all();

  const dbAnnotations = new Db(annotationsDatabaseFile);
  const annotations = dbAnnotations
    .prepare(
      `SELECT
      ZANNOTATIONASSETID as assetId, ZANNOTATIONUUID as uuid, ZANNOTATIONSELECTEDTEXT as selectedText, ZFUTUREPROOFING5 as Chapter, ZANNOTATIONCREATIONDATE as Created, ZANNOTATIONMODIFICATIONDATE as Modified
      FROM ZAEANNOTATION
      WHERE ZANNOTATIONDELETED = 0 AND ZANNOTATIONSELECTEDTEXT NOT NULL`
    )
    .all();

  await fs.writeFile("./export/books.json", JSON.stringify(books));
  await fs.writeFile("./export/annotations.json", JSON.stringify(annotations));

  process.exit();
})();
