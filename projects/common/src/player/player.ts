import { ScoreSaberPlayerHistory } from "../schemas/scoresaber/player/history";

export default class Player {
  id: string;

  name: string;

  avatar: string;

  country: string;

  rank: number;

  countryRank: number;

  hmd?: string;

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

export type StatisticRange = "daily" | "weekly" | "monthly";
export type StatisticChange = {
  [key in StatisticRange]: ScoreSaberPlayerHistory;
};
