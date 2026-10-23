import { ASSISTANT_POINTS_PER_RATING, PRESENTER_POINTS_PER_RATING } from '@lemne/shared';

export interface RoundScore {
  average: number | null;
  presenterPoints: number;
  assistantPoints: number;
}

/** Ratings are 0 (lemn) … 100 (diamant). The assistant shares in a good presentation. */
export function scoreRound(ratings: number[]): RoundScore {
  if (ratings.length === 0) return { average: null, presenterPoints: 0, assistantPoints: 0 };
  const average = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
  return {
    average,
    presenterPoints: average * PRESENTER_POINTS_PER_RATING,
    assistantPoints: average * ASSISTANT_POINTS_PER_RATING,
  };
}

export interface AwardPick {
  awardId: string;
  playerId: string;
}

interface RatedRound {
  presenterId: string;
  assistantId: string;
  average: number | null;
}

/** Award ids must exist in content/awards.json. */
export function pickAwards(rounds: RatedRound[]): AwardPick[] {
  const rated = rounds.filter((r): r is RatedRound & { average: number } => r.average !== null);
  if (rated.length === 0) return [];
  const best = rated.reduce((a, b) => (b.average > a.average ? b : a));
  const worst = rated.reduce((a, b) => (b.average < a.average ? b : a));
  const awards: AwardPick[] = [{ awardId: 'diamantul-serii', playerId: best.presenterId }];
  if (worst !== best) {
    awards.push({ awardId: 'cel-mai-lemn', playerId: worst.presenterId });
    awards.push({ awardId: 'asistentul-tradator', playerId: worst.assistantId });
  }
  return awards;
}
