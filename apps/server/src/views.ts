import type { AwardWinner, HostView, PlayerView, PublicPlayer, Role, RoundInfo } from '@lemne/shared';
import { content } from './content';
import {
  canAdvance,
  currentRound,
  nextPickIndex,
  raterIds,
  type GameState,
  type Player,
} from './game/machine';
import type { Room } from './rooms';

function toPublic(p: Player): PublicPlayer {
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    connected: p.connected,
    score: p.score,
    photoCount: p.photoIds.length,
  };
}

function roundInfo(game: GameState): RoundInfo | null {
  const round = currentRound(game);
  if (!round) return null;
  return {
    index: game.roundIndex,
    total: game.rounds.length,
    presenterId: round.presenterId,
    assistantId: round.assistantId,
    title: game.roundTitle,
    slideIndex: game.slideIndex,
    slideCount: round.optionSets.length,
  };
}

function awards(game: GameState): AwardWinner[] {
  return game.awards.flatMap((a) => {
    const award = content.awards.find((c) => c.id === a.awardId);
    return award ? [{ ...award, playerId: a.playerId }] : [];
  });
}

function common(room: Room) {
  const { game } = room;
  return {
    code: room.code,
    phase: game.phase,
    players: game.players.map(toPublic),
    vipId: game.vipId,
    round: roundInfo(game),
    endsAt: game.endsAt,
    serverNow: Date.now(),
    lastResult: game.phase === 'ROUND_RESULTS' ? (game.results.at(-1) ?? null) : null,
    awards: awards(game),
  };
}

export function toHostView(room: Room): HostView {
  const { game } = room;
  const raters = raterIds(game);
  return {
    ...common(room),
    slide: game.phase === 'PRESENTING' ? (game.shown[game.slideIndex] ?? null) : null,
    ratedCount: raters.filter((id) => id in game.ratings).length,
    raterCount: raters.length,
    titleProgress:
      game.phase === 'TITLE_WRITING'
        ? game.players.map((p) => ({
            playerId: p.id,
            count: game.titles.filter((t) => t.authorId === p.id).length,
            done: game.titlesDone.includes(p.id),
          }))
        : [],
  };
}

export function toPlayerView(room: Room, playerId: string): PlayerView | null {
  const { game } = room;
  const me = game.players.find((p) => p.id === playerId);
  if (!me) return null;

  const round = currentRound(game);
  const role: Role | null = !round
    ? null
    : round.presenterId === playerId
      ? 'presenter'
      : round.assistantId === playerId
        ? 'assistant'
        : 'audience';
  const presenting = game.phase === 'PRESENTING';
  const slideUp = presenting && game.shown.length > game.slideIndex;
  const pickIndex = role === 'assistant' ? nextPickIndex(game) : null;

  return {
    ...common(room),
    me: toPublic(me),
    isVip: game.vipId === playerId,
    role,
    photoIds: me.photoIds,
    // Phones only ever get thumbnails.
    options:
      pickIndex === null
        ? null
        : (round!.optionSets[pickIndex] ?? []).map((o) =>
            o.kind === 'image' ? { ...o, src: o.thumb } : o,
          ),
    pickIndex,
    slideUp: role === 'presenter' && slideUp,
    canAdvance: role === 'presenter' && canAdvance(game),
    prompt: role === 'presenter' && slideUp ? (round!.prompts[game.slideIndex] ?? null) : null,
    myTitles:
      game.phase === 'TITLE_WRITING'
        ? game.titles.filter((t) => t.authorId === playerId).map((t) => t.text)
        : [],
    titlesDone: game.titlesDone.includes(playerId),
    titleChoices:
      game.phase === 'ROUND_INTRO' && role === 'presenter' && game.roundTitle === null
        ? game.titleChoices
        : null,
    myRating: game.phase === 'RATING' ? (game.ratings[playerId] ?? null) : null,
  };
}
