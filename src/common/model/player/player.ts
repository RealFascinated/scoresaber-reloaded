export default class Player {
  /**
   * The ID of this player.
   */
  id: string;

  /**
   * The name of this player.
   */
  name: string;

  /**
   * The avatar url for this player.
   */
  avatar: string;

  /**
   * The country of this player.
   */
  country: string;

  /**
   * The rank of the player.
   */
  rank: number;

  /**
   * The rank the player has in their country.
   */
  countryRank: number;

  /**
   * The date the player joined the playform.
   */
  joinedDate: Date;

  constructor(
    id: string,
    name: string,
    avatar: string,
    country: string,
    rank: number,
    countryRank: number,
    joinedDate: Date
  ) {
    this.id = id;
    this.name = name;
    this.avatar = avatar;
    this.country = country;
    this.rank = rank;
    this.countryRank = countryRank;
    this.joinedDate = joinedDate;
  }
}
