import RankingRequestToken from "src/types/token/scoresaber/ranking-request-token";

export default interface ScoreSaberRankingRequestsResponse {
  nextInQueue: RankingRequestToken[];
  openRankUnrank: RankingRequestToken[];
  all: RankingRequestToken[];
}
