import RankingRequestToken from "../../../types/token/scoresaber/v1/ranking-request-token";

export default interface ScoreSaberRankingRequestsResponse {
  nextInQueue: RankingRequestToken[];
  openRankUnrank: RankingRequestToken[];
  all: RankingRequestToken[];
}
