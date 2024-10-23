import { prop } from "@typegoose/typegoose";

export default class BeatSaverAuthor {
  /**
   * The id of the author.
   */
  @prop({ required: true })
  id: number;

  /**
   * The name of the mapper.
   */
  @prop({ required: true })
  name: string;

  /**
   * The avatar URL for the mapper.
   */
  @prop({ required: true })
  avatar: string;

  constructor(id: number, name: string, avatar: string) {
    this.id = id;
    this.name = name;
    this.avatar = avatar;
  }
}
