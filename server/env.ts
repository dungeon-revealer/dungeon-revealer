import path from "path";
import { getDefaultDataDirectory } from "./util";
import * as VERSION from "./version";

export const getEnv = (env: NodeJS.ProcessEnv) => {
  const PUBLIC_PATH = path.resolve(__dirname, "..", "build");
  const PUBLIC_URL = env.PUBLIC_URL ?? "";
  const PORT = parseInt(env.PORT ?? "3000", 10);
  const HOST = env.HOST ?? "0.0.0.0";
  const PC_PASSWORD = env.PC_PASSWORD ?? null;
  const DM_PASSWORD = env.DM_PASSWORD ?? null;
  const DATA_DIRECTORY = env.DATA_DIRECTORY ?? getDefaultDataDirectory();

  return {
    DATA_DIRECTORY,
    PUBLIC_PATH,
    PUBLIC_URL,
    PORT,
    HOST,
    PC_PASSWORD,
    DM_PASSWORD,
    VERSION,
  };
};
