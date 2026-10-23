import type { ErrorCode } from '@lemne/shared';

export const ro = {
  appName: 'Lemne',
  tagline: 'Prezentări pe care nu le-ai pregătit niciodată.',

  home: {
    create: 'Creează cameră',
    createHint: 'Pe ecranul mare (TV sau laptop)',
    join: 'Intră în cameră',
    joinHint: 'De pe telefon',
    codeLabel: 'Codul camerei',
    nameLabel: 'Numele tău',
    namePlaceholder: 'ex. Gigel',
    submitJoin: 'Intră',
    back: 'Înapoi',
  },

  host: {
    joinAt: 'Intră de pe telefon pe',
    roomCode: 'Codul camerei',
    waitingForPlayers: 'Așteptăm prezentatorii…',
    playersCount: (n: number, min: number) =>
      n < min ? `${n} jucători · mai trebuie ${min - n}` : `${n} jucători · gata de start`,
    vip: 'Șef de sală',
    photosCount: (n: number) => (n === 1 ? '1 poză adusă de voi' : `${n} poze aduse de voi`),
  },

  roles: {
    presenter: 'Prezentator',
    assistant: 'Asistent',
    audience: 'Public',
  },

  scale: {
    wood: 'Lemn',
    diamond: 'Diamant',
    verdict: (v: number) =>
      v < 20
        ? 'Lemn masiv.'
        : v < 40
          ? 'Încă puțin lemnos.'
          : v < 60
            ? 'Nici lemn, nici diamant.'
            : v < 80
              ? 'Aproape strălucitor.'
              : 'Diamant curat!',
  },

  game: {
    round: (i: number, n: number) => `Runda ${i + 1} din ${n}`,
    slide: (i: number, n: number) => `Slide ${i + 1}/${n}`,
    presents: 'prezintă',
    helpedBy: 'cu ajutorul lui',
    start: 'Pornește jocul',
    needPlayers: (n: number, min: number) => `Mai trebuie ${min - n} jucători`,
    playAgain: 'Încă o tură',
    points: (n: number) => `+${n} puncte`,
    pointsTotal: (n: number) => `${n} p`,
    noVotes: 'Nimeni n-a votat. Tăcere de pădure.',
  },

  hostGame: {
    assistantPicking: 'Asistentul alege slide-ul…',
    rateNow: 'Cât de lemn a fost?',
    rateHint: 'Votați de pe telefon: de la lemn la diamant.',
    rated: (n: number, total: number) => `${n} din ${total} au votat`,
    results: 'Verdictul publicului',
    scores: 'Clasament',
    final: 'Gata! Mulțumim pentru atenție!',
    awards: 'Premii',
    mute: 'Fără sunet',
    fullscreen: 'Ecran complet',
  },

  phone: {
    introPresenter: 'Tu prezinți! Uită-te la ecranul mare.',
    introAssistant: 'Tu ești asistentul. Alegi slide-urile prezentatorului.',
    introAudience: 'Tu ești în public. Ascultă și pregătește verdictul.',
    pick: 'Alege slide-ul care îl încurcă cel mai tare.',
    pickedWait: 'Gata. Acum se descurcă el.',
    presenterWait: 'Asistentul îți alege slide-ul…',
    presenterTalk: 'Vorbește! Când ai terminat cu slide-ul, apasă mai jos.',
    next: 'Următorul slide',
    finish: 'Încheie prezentarea',
    promptLabel: 'Bonus de strecurat:',
    audienceWatch: 'Prezentatorul transpiră. Tu doar privește.',
    rate: 'Cât de lemn a fost?',
    rateSend: 'Trimite verdictul',
    rated: 'Verdict trimis. Așteptăm restul sălii…',
    beingRated: 'Publicul te judecă. Respiră.',
    resultsLook: 'Uită-te la ecranul mare.',
    yourScore: 'Scorul tău',
    youWon: 'Ai câștigat!',
    yourAwards: 'Premiile tale',
    vipRestart: 'Tu decizi dacă mai jucăm o tură.',
  },

  play: {
    youAreIn: 'Ești în cameră!',
    waitForStart: 'Ține telefonul aproape. Jocul începe imediat.',
    youAreVip: 'Tu ești șeful de sală. Tu pornești jocul.',
    noSession: 'Nu mai ești în cameră.',
    backHome: 'Înapoi la început',
    photos: {
      title: 'Pozele tale',
      hint: (max: number) => `Alege până la ${max} poze. Pot apărea ca slide-uri pe ecranul mare.`,
      add: 'Adaugă',
      remove: 'Scoate poza',
      uploading: 'Se urcă…',
    },
  },

  connection: {
    reconnecting: 'Te reconectăm…',
  },

  errors: {
    INVALID_PAYLOAD: 'Ceva nu e în regulă cu datele. Mai încearcă o dată.',
    ROOM_NOT_FOUND: 'Nu există nicio cameră cu codul ăsta.',
    ROOM_FULL: 'Camera e plină.',
    NAME_TAKEN: 'Numele e deja luat. Alege altul.',
    GAME_IN_PROGRESS: 'Jocul a început deja.',
    NOT_IN_ROOM: 'Nu mai ești în cameră.',
    TOO_MANY_PHOTOS: 'Ai ajuns la numărul maxim de poze.',
    INVALID_PHOTO: 'Poza asta nu merge. Încearcă alta.',
    NOT_ENOUGH_PLAYERS: 'Trebuie cel puțin 3 jucători conectați.',
    NOT_ALLOWED: 'Nu e rândul tău.',
    WRONG_PHASE: 'Prea târziu, jocul a mers mai departe.',
  } satisfies Record<ErrorCode, string>,
};
