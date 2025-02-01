import { Entity } from "dexie";
import Database from "@/common/database/database";

export default class IdDatabaseObject extends Entity<Database> {
  /**
   * The internal id of this database object
   */
  id!: string;
}
