import { FileInfo } from "../lib/process";
import { Root } from "mdast";
import { MarkdownDB } from "../lib/markdowndb";
import { z } from "zod";
import fs from "fs";
import os from "os";
import path from "path";
import { randomBytes } from "crypto";

describe("Document Types Schema Validate Testing", () => {
  const pathToContentFixture = "__mocks__/content";
  let mddb: MarkdownDB;
  let dbFile: string;

  beforeAll(async () => {
    dbFile = path.join(
      os.tmpdir(),
      `markdowndb-${randomBytes(8).toString("hex")}.sqlite`
    );
    const dbConfig = {
      client: "sqlite3",
      connection: {
        filename: dbFile,
      },
    };
    mddb = new MarkdownDB(dbConfig);
    await mddb.init();
  });

  afterAll(async () => {
    await mddb.db.destroy();
    fs.rmSync(dbFile, { force: true });
  });
  
  test("Should check if the title field is created and save in db", async () => {
    await mddb.indexFolder({
      folderPath: pathToContentFixture,
      customConfig: {
        computedFields: [
          (fileInfo: FileInfo, ast: Root) => {
            fileInfo.title = "Hello";
          },
        ],
        schemas: {
          blog: z.object({
            title: z.string(),
          }),
        },
      },
    });
    const dbFiles = await mddb.getFiles({ filetypes: ["blog"] });
    for (const file of dbFiles) {
      expect(file.title).toBe("Hello");
    }
  });

  test("Test that the 'indexFolder' function throws a validation error for a missing field in the blog schema.", async () => {
    await expect(
      mddb.indexFolder({
        folderPath: pathToContentFixture,
        customConfig: {
          schemas: {
            blog: z.object({
              missingField: z.string(),
            }),
          },
        },
      })
    ).rejects.toThrow(
      "Validation Failed: Unable to validate files against the specified scheme."
    );
  });
});
