export default interface BeatSaverAccount {
  /**
   * The id of the mapper
   */
  id: number;

  /**
   * The name of the mapper.
   */
  name: string;

  /**
   * The account hash of the mapper.
   */
  hash: string;

  /**
   * The avatar url for the mapper.
   */
  avatar: string;

  /**
   * The way the account was created
   */
  type: string;

  /**
   * Whether the account is an admin or not.
   */
  admin: boolean;

  /**
   * Whether the account is a curator or not.
   */
  curator: boolean;

  /**
   * Whether the account is a senior curator or not.
   */
  seniorCurator: boolean;

  /**
   * Whether the account is a verified mapper or not.
   */
  verifiedMapper: boolean;

  /**
   * The playlist for the mappers songs.
   */
  playlistUrl: string;
}
