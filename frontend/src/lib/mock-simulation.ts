import {
  TelemetryFrame,
  PlayerTelemetry,
  BallTelemetry,
  PassingLane,
  SyntheticScenarioType,
  NarrativeEvent,
} from '../types/telemetry';

// Realistic 22-player squads: Manchester City (Home, Blue) vs Arsenal (Away, Red)
const INITIAL_PLAYERS: PlayerTelemetry[] = [
  // Man City (Home - attacking left to right: x: 10 to 75)
  { id: 'h1', name: 'Ederson', number: 31, team: 'home', role: 'GK', x: 6.0, y: 34.0, vx: 0.1, vy: 0, speedKmH: 2.1, distanceMeters: 2840 },
  { id: 'h2', name: 'Kyle Walker', number: 2, team: 'home', role: 'DF', x: 42.0, y: 12.0, vx: 1.2, vy: 0.2, speedKmH: 15.4, distanceMeters: 7420 },
  { id: 'h3', name: 'Rúben Dias', number: 3, team: 'home', role: 'DF', x: 38.0, y: 26.0, vx: 0.4, vy: -0.1, speedKmH: 6.8, distanceMeters: 6980 },
  { id: 'h4', name: 'Manuel Akanji', number: 25, team: 'home', role: 'DF', x: 39.0, y: 42.0, vx: 0.5, vy: 0.1, speedKmH: 7.2, distanceMeters: 7120 },
  { id: 'h5', name: 'Josko Gvardiol', number: 24, team: 'home', role: 'DF', x: 48.0, y: 58.0, vx: 1.1, vy: -0.3, speedKmH: 14.1, distanceMeters: 7850 },
  { id: 'h6', name: 'Rodri', number: 16, team: 'home', role: 'MF', x: 55.0, y: 34.0, vx: 0.8, vy: 0.4, speedKmH: 10.2, distanceMeters: 8940 },
  { id: 'h7', name: 'Bernardo Silva', number: 20, team: 'home', role: 'MF', x: 64.0, y: 22.0, vx: 1.4, vy: 0.8, speedKmH: 16.5, distanceMeters: 9230 },
  { id: 'h8', name: 'Kevin De Bruyne', number: 17, team: 'home', role: 'MF', x: 68.0, y: 40.0, vx: 1.0, vy: -0.5, speedKmH: 13.8, distanceMeters: 8140 },
  { id: 'h9', name: 'Phil Foden', number: 47, team: 'home', role: 'FW', x: 74.0, y: 16.0, vx: 1.8, vy: 0.9, speedKmH: 21.4, distanceMeters: 8650 },
  { id: 'h10', name: 'Jack Grealish', number: 10, team: 'home', role: 'FW', x: 72.0, y: 52.0, vx: 1.3, vy: -0.4, speedKmH: 17.0, distanceMeters: 8320 },
  { id: 'h11', name: 'Erling Haaland', number: 9, team: 'home', role: 'FW', x: 86.0, y: 35.0, vx: 2.1, vy: 0.1, speedKmH: 25.8, distanceMeters: 7100, isDesignatedPlayerCam: true },

  // Arsenal (Away - defending right: x: 65 to 98)
  { id: 'a1', name: 'David Raya', number: 22, team: 'away', role: 'GK', x: 99.0, y: 34.0, vx: -0.1, vy: 0, speedKmH: 2.5, distanceMeters: 2950 },
  { id: 'a2', name: 'Ben White', number: 4, team: 'away', role: 'DF', x: 75.0, y: 16.0, vx: -1.1, vy: -0.5, speedKmH: 14.8, distanceMeters: 7890 },
  { id: 'a3', name: 'William Saliba', number: 2, team: 'away', role: 'DF', x: 85.0, y: 28.0, vx: -0.8, vy: 0.2, speedKmH: 12.1, distanceMeters: 7650 },
  { id: 'a4', name: 'Gabriel', number: 6, team: 'away', role: 'DF', x: 86.0, y: 41.0, vx: -0.6, vy: -0.2, speedKmH: 10.9, distanceMeters: 7520 },
  { id: 'a5', name: 'Jurriën Timber', number: 12, team: 'away', role: 'DF', x: 76.0, y: 54.0, vx: -1.0, vy: 0.4, speedKmH: 13.9, distanceMeters: 7780 },
  { id: 'a6', name: 'Thomas Partey', number: 5, team: 'away', role: 'MF', x: 69.0, y: 30.0, vx: -0.7, vy: -0.3, speedKmH: 11.5, distanceMeters: 8210 },
  { id: 'a7', name: 'Declan Rice', number: 41, team: 'away', role: 'MF', x: 71.0, y: 44.0, vx: -1.2, vy: 0.6, speedKmH: 16.2, distanceMeters: 9340 },
  { id: 'a8', name: 'Martin Ødegaard', number: 8, team: 'away', role: 'MF', x: 62.0, y: 35.0, vx: -1.5, vy: -0.8, speedKmH: 19.3, distanceMeters: 8900 },
  { id: 'a9', name: 'Bukayo Saka', number: 7, team: 'away', role: 'FW', x: 58.0, y: 14.0, vx: -1.9, vy: 1.1, speedKmH: 23.6, distanceMeters: 8540 },
  { id: 'a10', name: 'Gabriel Martinelli', number: 11, team: 'away', role: 'FW', x: 56.0, y: 55.0, vx: -2.0, vy: -0.9, speedKmH: 24.5, distanceMeters: 8670 },
  { id: 'a11', name: 'Kai Havertz', number: 29, team: 'away', role: 'FW', x: 52.0, y: 34.0, vx: -1.4, vy: 0.2, speedKmH: 17.8, distanceMeters: 8430 }
];

export class MockSimulationEngine {
  private frameCount = 0;
  private currentScenario: SyntheticScenarioType = 'high_possession';
  private players: PlayerTelemetry[] = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
  private ball: BallTelemetry = { x: 67.5, y: 39.5, z: 0.0, vx: 0.8, vy: -0.4, vz: 0, speedKmH: 24.2 };
  private activePassingLanes: PassingLane[] = [];
  private currentNarrativeIndex = 0;

  private scenariosNarratives: Record<SyntheticScenarioType, NarrativeEvent[]> = {
    high_possession: [
      {
        id: 'narr-1',
        matchClock: '68:42',
        timestamp: Date.now(),
        isTacticalInflectionPoint: false,
        headline: {
          en: 'Sustained Manchester City High-Press Siege',
          es: 'Asedio continuo de presión alta del Manchester City',
          fr: 'Siège soutenu du pressing haut de Manchester City',
          ja: 'マンチェスター・シティによる持続的なハイプレス包囲網',
          ar: 'حصار الضغط العالي المستمر من مانشستر سيتي'
        },
        tacticalExplanation: {
          en: 'De Bruyne and Bernardo pin Arsenal fullbacks deep into their defensive third, compressing Pitch Space.',
          es: 'De Bruyne y Bernardo fijan a los laterales del Arsenal en su tercio defensivo, comprimiendo el espacio del campo.',
          fr: 'De Bruyne et Bernardo fixent les latéraux d\'Arsenal dans leur tiers défensif, comprimant l\'espace de jeu.',
          ja: 'デ・ブライネとベルナルドがアーセナルのSBを自陣深くに釘付けにし、ピッチスペースを圧縮。',
          ar: 'دي بروين وبرناردو يجبران أظهرة أرسنال على التراجع لثلثهم الدفاعي، مما يضيق مساحة الملعب.'
        },
        analystContext: 'Pass Difficulty Rating (PDR) rises to 74.2 due to Arsenal inner-block congestion. Home Pitch Control stands at 68.4%.',
        casualContext: 'City are suffocating Arsenal with relentless passing, waiting for one tiny defensive mistake to strike.',
        clubCentricContext: {
          homeFrame: 'City total dominance: 83 passes completed in Arsenal half over the last 10 minutes.',
          awayFrame: 'Arsenal defensive discipline holding strong: Saliba and Gabriel clearing inside box entries.'
        }
      },
      {
        id: 'narr-2',
        matchClock: '69:15',
        timestamp: Date.now(),
        isTacticalInflectionPoint: true,
        headline: {
          en: 'Tactical Inflection Point: Rodri Finds Half-Space Pocket',
          es: 'Punto de inflexión táctico: Rodri encuentra el espacio interior',
          fr: 'Point d\'inflexion tactique : Rodri trouve la poche du demi-espace',
          ja: '戦術的変曲点：ロドリがハーフスペースのポケットを攻略',
          ar: 'نقطة تحول تكتيكية: رودري يكتشف ثغرة في نصف المساحة'
        },
        tacticalExplanation: {
          en: 'Passing Lane opened through Partey and Rice split. Instantaneous threat multiplier spikes by 2.4x.',
          es: 'Línea de pase abierta entre Partey y Rice. El multiplicador de amenaza instantáneo aumenta 2.4 veces.',
          fr: 'Ligne de passe ouverte dans l\'intervalle entre Partey et Rice. Le multiplicateur de danger triple presque.',
          ja: 'トーマスとライスの間を抜くパッシングレーンが開通。脅威係数が2.4倍に急増。',
          ar: 'انفتاح مسار التمرير بين بارتي ورايس، مما رفع مؤشر الخطورة المباشرة بمقدار 2.4 ضعف.'
        },
        analystContext: 'Expected completion (xP) was 61%, PDR 78.5. Passing lane width widened by 3.2m during Ødegaard recovery press.',
        casualContext: 'What a split pass from Rodri! City knife right through the center of the midfield.',
        clubCentricContext: {
          homeFrame: 'Masterclass orchestrator: Rodri breaks Arsenal midfield structure with precision pass.',
          awayFrame: 'Defensive lapse: Midfield pivot separated by 8.4 meters allowing central line-break.'
        }
      }
    ],
    counter_attack_transition: [
      {
        id: 'narr-3',
        matchClock: '74:10',
        timestamp: Date.now(),
        isTacticalInflectionPoint: true,
        headline: {
          en: 'Tactical Inflection Point: High Turnover to Vertical Blitz',
          es: 'Punto de inflexión táctico: Pérdida alta y transición vertical rápida',
          fr: 'Point d\'inflexion tactique : Récupération haute et blitz vertical',
          ja: '戦術的変曲点：高い位置でのボール奪取から電光石火のカウンター',
          ar: 'نقطة تحول تكتيكية: افتكاك الكرة في الثلث الأخير وهجمة مرتدة خاطفة'
        },
        tacticalExplanation: {
          en: 'Saka intercepts loose Gvardiol pass. Control vs. Chaos Index surges from 28 to 88 within 1.8 seconds.',
          es: 'Saka intercepta un pase suelto de Gvardiol. El índice de Control vs. Caos sube de 28 a 88 en 1.8 segundos.',
          fr: 'Saka intercepte une passe imprécise de Gvardiol. L\'indice Contrôle vs Chaos explose de 28 à 88 en 1,8 seconde.',
          ja: 'サカがグヴァルディオルのパスをカット。「コントロール対カオス指数」が1.8秒で28から88に跳ね上がる。',
          ar: 'ساكا يقطع تمريرة غفارديول المتهورة. مؤشر التحكم مقابل الفوضى يقفز من 28 إلى 88 في غضون 1.8 ثانية.'
        },
        analystContext: 'Turnover vulnerability realized. Pitch Control flips: Arsenal transitional speed measured at 27.4 km/h.',
        casualContext: 'Lightning counter-attack! Saka breaks free down the right wing with numbers forward!',
        clubCentricContext: {
          homeFrame: 'City caught out: Recovery sprint triggered for Walker and Dias across 45 meters.',
          awayFrame: 'Arsenal lethal transition: 3 vs 2 overload developing inside 4 seconds.'
        }
      }
    ],
    low_block_siege: [
      {
        id: 'narr-4',
        matchClock: '82:05',
        timestamp: Date.now(),
        isTacticalInflectionPoint: false,
        headline: {
          en: 'Compact Arsenal Low-Block Absorbing Pressure',
          es: 'Bloque bajo compacto del Arsenal absorbiendo la presión',
          fr: 'Bloc bas compact d\'Arsenal absorbant la pression',
          ja: 'アーセナルの強固なローブロックが圧力を吸収',
          ar: 'كتلة أرسنال الدفاعية المتأخرة والمنظمة تمتص الضغط'
        },
        tacticalExplanation: {
          en: 'Arsenal defensive line compressed within 18 meters from goal line. Passing Lane density severely restricted.',
          es: 'Línea defensiva del Arsenal comprimida a 18 metros de la portería. Densidad de líneas de pase severamente restringida.',
          fr: 'Ligne défensive d\'Arsenal resserrée à moins de 18 mètres du but. Lignes de passes verrouillées.',
          ja: 'アーセナルの守備陣がゴール前18メートルに結集。パッシングレーンを完全に封鎖。',
          ar: 'خط دفاع أرسنال متكتل في مسافة 18 متراً من خط المرمى، مغلقاً جميع مسارات التمرير المحتملة.'
        },
        analystContext: 'Pass Difficulty Rating (PDR) at match-high 82.1. Expected completion in central penalty box under 22%.',
        casualContext: 'A wall of red shirts inside the box. City probe side to side searching for an opening.',
        clubCentricContext: {
          homeFrame: 'City testing defensive patience with 76% territorial possession in final third.',
          awayFrame: 'Masterful defensive shape: Arsenal forcing City into low-percentage crosses.'
        }
      }
    ],
    box_scramble: [
      {
        id: 'narr-5',
        matchClock: '89:50',
        timestamp: Date.now(),
        isTacticalInflectionPoint: true,
        headline: {
          en: 'Tactical Inflection Point: Penalty Box Chaos Sequence',
          es: 'Punto de inflexión táctico: Secuencia caótica en el área de penalti',
          fr: 'Point d\'inflexion tactique : Séquence de chaos dans la surface de réparation',
          ja: '戦術的変曲点：ペナルティエリア内の激しい混戦シーケンス',
          ar: 'نقطة تحول تكتيكية: دربكة وفوضى عارمة داخل منطقة الجزاء'
        },
        tacticalExplanation: {
          en: 'Haaland duel contest with Gabriel triggers 3 consecutive ricochets. Control vs. Chaos Index reaches 95.',
          es: 'El duelo entre Haaland y Gabriel provoca 3 rebotes consecutivos. El índice Control vs. Caos llega a 95.',
          fr: 'Le duel Haaland-Gabriel provoque 3 déviations successives. L\'indice Contrôle vs Chaos atteint 95.',
          ja: 'ハーランドとマガリャンイスの競り合いから3連続リバウンド。「コントロール対カオス指数」が95に到達。',
          ar: 'التحام هالاند وغابرييل يسفر عن 3 كرات مرتدة متتالية، مؤشر التحكم مقابل الفوضى يبلغ 95.'
        },
        analystContext: 'xG surge to 0.68 across a 4-second sequence. Ball velocity variations: 12 km/h to 84 km/h.',
        casualContext: 'Absolute drama in the box! Scramble, blocks, and desperation defending at the death!',
        clubCentricContext: {
          homeFrame: 'Haaland physical exertion peaks at 28.4 km/h burst chasing the loose ball.',
          awayFrame: 'Heroic goal-line resistance from David Raya and Saliba preserving the clean sheet.'
        }
      }
    ]
  };

  public setScenario(scenario: SyntheticScenarioType) {
    this.currentScenario = scenario;
    this.currentNarrativeIndex = 0;
  }

  public getScenario(): SyntheticScenarioType {
    return this.currentScenario;
  }

  public nextFrame(): TelemetryFrame {
    this.frameCount++;
    const t = this.frameCount * 0.1; // simulated time parameter

    // Dynamic player movement based on scenario
    this.players = this.players.map((p) => {
      let vx = p.vx;
      let vy = p.vy;

      if (this.currentScenario === 'high_possession') {
        // City circulates patiently, Arsenal slides laterally
        if (p.team === 'home') {
          vx = Math.sin(t * 0.8 + p.number) * 0.6;
          vy = Math.cos(t * 0.5 + p.number) * 0.8;
        } else {
          vx = Math.sin(t * 0.7 + p.number) * 0.4;
          vy = Math.cos(t * 0.6 + p.number) * 0.5;
        }
      } else if (this.currentScenario === 'counter_attack_transition') {
        // High pace horizontal sprint
        if (p.id === 'a9' || p.id === 'a10' || p.id === 'a8') { // Saka, Martinelli, Odegaard
          vx = -2.8 - Math.random() * 0.8;
          vy = (Math.random() - 0.5) * 0.8;
        } else if (p.id === 'h2' || p.id === 'h3') { // Walker, Dias
          vx = -2.4 - Math.random() * 0.6;
          vy = (Math.random() - 0.5) * 0.6;
        }
      } else if (this.currentScenario === 'box_scramble') {
        // High chaos jitter in penalty area (x: 85 to 102, y: 20 to 48)
        vx = (Math.random() - 0.5) * 2.5;
        vy = (Math.random() - 0.5) * 2.5;
      }

      // Update positions with pitch boundaries (105m x 68m per ADR 0003)
      let newX = p.x + vx * 0.2;
      let newY = p.y + vy * 0.2;

      newX = Math.max(1.0, Math.min(104.0, newX));
      newY = Math.max(1.0, Math.min(67.0, newY));

      const speedKmH = Math.sqrt(vx * vx + vy * vy) * 3.6 * 2.2;
      const distanceMeters = p.distanceMeters + (speedKmH / 3.6) * 0.2;

      return {
        ...p,
        x: Number(newX.toFixed(2)),
        y: Number(newY.toFixed(2)),
        vx: Number(vx.toFixed(2)),
        vy: Number(vy.toFixed(2)),
        speedKmH: Number(speedKmH.toFixed(1)),
        distanceMeters: Math.round(distanceMeters)
      };
    });

    // Ball movement
    const ballCarrier = this.players.find(p => p.id === 'h8') || this.players[8];
    this.ball.x = Number((ballCarrier.x + Math.sin(t * 2) * 1.5).toFixed(2));
    this.ball.y = Number((ballCarrier.y + Math.cos(t * 2) * 1.5).toFixed(2));
    this.ball.speedKmH = Number((18 + Math.abs(Math.sin(t * 3)) * 42).toFixed(1));

    // Calculate synthetic passing lanes from ball carrier
    const passer = ballCarrier;
    const potentialReceivers = this.players.filter(p => p.team === passer.team && p.id !== passer.id).slice(0, 4);

    this.activePassingLanes = potentialReceivers.map((rec) => {
      // Distance to defenders along corridor
      const dist = Math.hypot(rec.x - passer.x, rec.y - passer.y);
      const risk = Number(Math.min(0.95, Math.max(0.1, (dist / 35.0) + (Math.sin(t) * 0.2))).toFixed(2));
      const pdr = Math.round(risk * 100);

      return {
        passerId: passer.id,
        receiverId: rec.id,
        passerPos: { x: passer.x, y: passer.y },
        receiverPos: { x: rec.x, y: rec.y },
        interceptionRisk: risk,
        passDifficultyRating: pdr,
        isClear: risk < 0.45
      };
    });

    // Control vs Chaos Index calculation
    let chaosVal = 24;
    let rhythm: 'Structured' | 'Fluid' | 'High Intensity' | 'Chaotic Break' = 'Structured';
    if (this.currentScenario === 'counter_attack_transition') {
      chaosVal = 82;
      rhythm = 'Chaotic Break';
    } else if (this.currentScenario === 'box_scramble') {
      chaosVal = 94;
      rhythm = 'High Intensity';
    } else if (this.currentScenario === 'high_possession') {
      chaosVal = 32;
      rhythm = 'Fluid';
    }

    const narrativeList = this.scenariosNarratives[this.currentScenario];
    const currentNarrative = narrativeList[Math.floor(this.frameCount / 40) % narrativeList.length];

    return {
      frameId: this.frameCount,
      matchClock: '68:' + (40 + (Math.floor(this.frameCount * 0.2) % 60)).toString().padStart(2, '0'),
      scenario: this.currentScenario,
      ball: this.ball,
      players: this.players,
      passingLanes: this.activePassingLanes,
      metrics: {
        controlVsChaosIndex: chaosVal + Math.sin(t) * 4,
        passDifficultyRating: Math.round(62 + Math.cos(t * 1.5) * 12),
        gameRhythm: rhythm,
        pitchControl: {
          homePercentage: this.currentScenario === 'high_possession' ? 68.2 : 46.5,
          awayPercentage: this.currentScenario === 'high_possession' ? 24.8 : 44.0,
          contestedPercentage: this.currentScenario === 'high_possession' ? 7.0 : 9.5
        },
        fastPathLatencyMs: 14 + Math.round(Math.random() * 8), // Tiered Fast-Path: always <50ms
        agentReasoningLatencyMs: 640 + Math.round(Math.random() * 280) // Agent Narrative: always <1.5s
      },
      latestNarrative: currentNarrative
    };
  }
}
