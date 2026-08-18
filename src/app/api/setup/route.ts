import {
  migrateSetupDatabase,
  readSetupConfiguration,
} from "./route.utils";

export const dynamic = "force-dynamic";

export const GET = readSetupConfiguration;
export const POST = migrateSetupDatabase;
