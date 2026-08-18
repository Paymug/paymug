export interface RuntimeDatabaseMigration {
  name: string;
  statements: string[];
}
