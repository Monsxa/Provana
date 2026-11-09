// Exporta los esquemas Zod de src/lib/esquemas.ts como JSON Schema en /esquemas.
// Uso: npm run esquemas
import { mkdirSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { ESQUEMAS } from "../src/lib/esquemas.ts";

mkdirSync("esquemas", { recursive: true });
for (const [nombre, esquema] of Object.entries(ESQUEMAS)) {
  const json = z.toJSONSchema(esquema, { io: "input" });
  writeFileSync(`esquemas/${nombre}.schema.json`, JSON.stringify(json, null, 2) + "\n");
  console.log(`esquemas/${nombre}.schema.json`);
}
