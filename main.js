import fs from "fs/promises";
import Db from "better-sqlite3";
import slugify from "slugify";

const ASSETS_DATABASE_DIRECTORY = `${process.env.HOME}/Library/Containers/com.apple.iBooksX/Data/Documents/BKLibrary`;
const ANNOTATIONS_DATABASE_DIRECTORY = `${process.env.HOME}/Library/Containers/com.apple.iBooksX/Data/Documents/AEAnnotation`;

const getDatabaseFile = async (directory) => {
  let databaseFile;
  let files;

  try {
    files = await fs.readdir(directory);
  } catch (e) {
    process.exit(1);
  }

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
  // ASSETS
  const assetsDatabaseFile = await getDatabaseFile(ASSETS_DATABASE_DIRECTORY);

  if (!assetsDatabaseFile) {
    process.exit(1);
  }

  const dbAssets = new Db(assetsDatabaseFile);

  const assets = dbAssets
    .prepare(
      `SELECT
      ZASSETID as id, ZTITLE AS title, ZAUTHOR AS author, ZLANGUAGE as language, ZPATH as path
      FROM ZBKLIBRARYASSET
      WHERE ZTITLE IS NOT NULL`
    )
    .all();

  const collections = dbAssets
    .prepare(
      `SELECT
      ZCOLLECTIONID as id, ZTITLE AS title, Z_PK as pk
      FROM ZBKCOLLECTION
      WHERE Z_PK > 8`
    )
    .all();

  const members = dbAssets
    .prepare(
      `SELECT
    ZCOLLECTION as id, ZASSETID as assetId
    FROM ZBKCOLLECTIONMEMBER
    WHERE ZCOLLECTION > 8`
    )
    .all();

  // COLLECTIONS

  for (const collection of collections) {
    const assetsInCollection = {
      id: collection.id,
      pk: collection.pk,
      title: collection.title,
      members: [],
    };

    const collectionMembers = members.filter((m) => {
      return m.id == collection.pk;
    });

    for (const member of collectionMembers) {
      const asset = assets.filter((a) => {
        return a.id == member.assetId;
      });

      if (asset) {
        assetsInCollection.members.push(asset);
      }
    }

    await fs.writeFile(
      `./export/${slugify(collection.title)}.json`,
      JSON.stringify(assetsInCollection)
    );
  }

  await fs.writeFile("./export/assets.json", JSON.stringify(assets));

  // ANNOTATIONS

  const annotationsDatabaseFile = await getDatabaseFile(
    ANNOTATIONS_DATABASE_DIRECTORY
  );

  if (!annotationsDatabaseFile) {
    process.exit(1);
  }

  const dbAnnotations = new Db(annotationsDatabaseFile);

  const annotations = dbAnnotations
    .prepare(
      `SELECT
      ZANNOTATIONASSETID as assetId, ZANNOTATIONSELECTEDTEXT as selectedText, ZFUTUREPROOFING5 as chapter, ZANNOTATIONCREATIONDATE as creationDate, ZANNOTATIONMODIFICATIONDATE as modificationDate
      FROM ZAEANNOTATION
      WHERE ZANNOTATIONDELETED = 0 AND ZANNOTATIONSELECTEDTEXT NOT NULL`
    )
    .all();

  const annotationsBook = [];

  for (const annotation of annotations) {
    const asset = assets.filter((a) => {
      return a.id == annotation.assetId;
    });

    annotationsBook.push({
      assetId: annotation.assetId,
      selectedText: annotation.selectedText,
      chapter: annotation.chapter,
      creationDate: annotation.creationDate,
      modificationDate: annotation.modificationDate,
      asset: asset,
    });
  }

  await fs.writeFile(
    "./export/annotations.json",
    JSON.stringify(annotationsBook)
  );

  process.exit();
})();
