import Database from "@/common/database/database";
import { Entity } from "dexie";

export default class IdDatabaseObject extends Entity<Database> {
  /**
   * The internal id of this database object
   */
  id!: string;
}
