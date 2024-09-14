export default interface BeatSaverMapMetadataToken {
  /**
   * The bpm of the song.
   */
  bpm: number;

  /**
   * The song's length in seconds.
   */
  duration: number;

  /**
   * The song's name.
   */
  songName: string;

  /**
   * The songs sub name.
   */
  songSubName: string;

  /**
   * The artist(s) name.
   */
  songAuthorName: string;

  /**
   * The song's author's url.
   */
  songAuthorUrl: string;

  /**
   * The level mapper(s) name.
   */
  levelAuthorName: string;
}
