import { prop } from "@typegoose/typegoose";

export default class BeatsaverAuthor {
  /**
   * The id of the author.
   */
  @prop({ required: true })
  id: number;

  constructor(id: number) {
    this.id = id;
  }
}
