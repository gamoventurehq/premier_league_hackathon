import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { IonIcon } from "@ionic/react";
import {
  micOutline,
  bookmarkOutline,
  documentTextOutline,
  playOutline,
  pauseOutline,
  copyOutline,
  checkmarkCircleOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";
import { StudioChipScroller } from "../StudioChipScroller";
import { SupportedLanguage, MatchEvent } from "../../types/telemetry";

interface StudioRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChapterMarker {
  timeLabel: string;
  timeSec: number;
  title: string;
  summary: string;
  metric: string;
  category: "goal" | "defense" | "keeper" | "tactical" | "physical" | "whistle";
}

const CHAPTER_MARKERS_BY_LANG: Record<SupportedLanguage, ChapterMarker[]> = {
  en: [
    {
      timeLabel: "00:00",
      timeSec: 0,
      title: "Kick-Off & Formation Setup",
      summary: "Man City establish 3-2-4-1 build-up shape against Arsenal's mid-block 4-4-2.",
      metric: "Initial Shape 4-3-3 vs 4-2-3-1",
      category: "tactical",
    },
    {
      timeLabel: "14:20",
      timeSec: 860,
      title: "Low-Block Compression & Rodri Line-Break",
      summary: "Rodri threads high-difficulty diagonal pass between Rice and Partey into half-space.",
      metric: "Pass Difficulty: 78%",
      category: "tactical",
    },
    {
      timeLabel: "28:45",
      timeSec: 1725,
      title: "Saliba Critical Box Clearance",
      summary: "Saliba denies Haaland tap-in with sliding interception inside the 6-yard area.",
      metric: "xT Prevented: 0.34",
      category: "tactical",
    },
    {
      timeLabel: "42:10",
      timeSec: 2530,
      title: "Goal: Erling Haaland Opener",
      summary: "Haaland latches onto De Bruyne cutback, powering shot into the top-right corner.",
      metric: "108.4 km/h • 0.78 xG",
      category: "goal",
    },
    {
      timeLabel: "44:55",
      timeSec: 2695,
      title: "Goal: Bukayo Saka Equalizer",
      summary: "Saka bursts down right flank in counter-transition, finishing past Ederson.",
      metric: "33.8 km/h • 4 Touches",
      category: "goal",
    },
    {
      timeLabel: "45'+2",
      timeSec: 2700,
      title: "Half-Time Whistle & Tactical Evaluation",
      summary: "Interval reached with parity; City dominate possession while Arsenal strike on break.",
      metric: "Pitch Control: MCI 61% - ARS 39%",
      category: "whistle",
    },
  ],
  es: [
    {
      timeLabel: "00:00",
      timeSec: 0,
      title: "Inicio y Disposición Táctica",
      summary: "El City establece un 3-2-4-1 en salida frente al bloque medio 4-4-2 del Arsenal.",
      metric: "Estructura 4-3-3 vs 4-2-3-1",
      category: "tactical",
    },
    {
      timeLabel: "14:20",
      timeSec: 860,
      title: "Compresión en Bloque Bajo y Pase de Rodri",
      summary: "Rodri filtra un pase diagonal de alta dificultad entre Rice y Partey al medio espacio.",
      metric: "Dificultad de Pase: 78%",
      category: "tactical",
    },
    {
      timeLabel: "28:45",
      timeSec: 1725,
      title: "Despeje Providencial de Saliba",
      summary: "Saliba frustra el remate de Haaland con una intercepción deslizante en el área pequeña.",
      metric: "xT Prevenido: 0.34",
      category: "tactical",
    },
    {
      timeLabel: "42:10",
      timeSec: 2530,
      title: "Gol: Apertura de Erling Haaland",
      summary: "Haaland aprovecha el centro retrasado de De Bruyne y fusila la escuadra derecha.",
      metric: "108.4 km/h • 0.78 xG",
      category: "goal",
    },
    {
      timeLabel: "44:55",
      timeSec: 2695,
      title: "Gol: Empate al Contragolpe de Bukayo Saka",
      summary: "Saka desborda por banda derecha en transición rápida y bate a Ederson.",
      metric: "33.8 km/h • 4 Toques",
      category: "goal",
    },
    {
      timeLabel: "45'+2",
      timeSec: 2700,
      title: "Descanso y Balance Táctico",
      summary: "Empate al descanso; dominio posicional del City frente al peligro vertical del Arsenal.",
      metric: "Control del Campo: MCI 61% - ARS 39%",
      category: "whistle",
    },
  ],
  fr: [
    {
      timeLabel: "00:00",
      timeSec: 0,
      title: "Coup d'Envoi & Organisation Tactique",
      summary: "Man City s'installe en 3-2-4-1 en relance face au bloc médian 4-4-2 d'Arsenal.",
      metric: "Schéma 4-3-3 vs 4-2-3-1",
      category: "tactical",
    },
    {
      timeLabel: "14:20",
      timeSec: 860,
      title: "Compression en Bloc Bas & Ligne Brisée par Rodri",
      summary: "Rodri délivre une diagonale millimétrée entre Rice et Partey dans le demi-espace.",
      metric: "Difficulté de Passe: 78%",
      category: "tactical",
    },
    {
      timeLabel: "28:45",
      timeSec: 1725,
      title: "Intervention Décisive de Saliba",
      summary: "Saliba sauve Arsenal devant Haaland d'un tacle glissé salvateur aux 6 mètres.",
      metric: "xT Évité: 0.34",
      category: "tactical",
    },
    {
      timeLabel: "42:10",
      timeSec: 2530,
      title: "But : Ouverture du Score par Erling Haaland",
      summary: "Haaland reprend un centre en retrait de De Bruyne et catapulte le cuir sous la barre.",
      metric: "108.4 km/h • 0.78 xG",
      category: "goal",
    },
    {
      timeLabel: "44:55",
      timeSec: 2695,
      title: "But : Égalisation en Contre-Attaque de Bukayo Saka",
      summary: "Saka perfore le flanc droit en transition rapide et ajuste Ederson.",
      metric: "33.8 km/h • 4 Touches",
      category: "goal",
    },
    {
      timeLabel: "45'+2",
      timeSec: 2700,
      title: "Coup de Sifflet de la Mi-Temps & Analyse",
      summary: "Parité à la pause ; City domine la possession tandis qu'Arsenal frappe en contre.",
      metric: "Contrôle du Terrain: MCI 61% - ARS 39%",
      category: "whistle",
    },
  ],
  ja: [
    {
      timeLabel: "00:00",
      timeSec: 0,
      title: "キックオフ＆フォーメーション配置",
      summary: "マンチェスター・シティはアーセナルの4-4-2ミドルブロックに対し3-2-4-1のビルドアップを展開。",
      metric: "初期配置 4-3-3 vs 4-2-3-1",
      category: "tactical",
    },
    {
      timeLabel: "14:20",
      timeSec: 860,
      title: "低位ブロック圧縮とロドリのライン間パス",
      summary: "ロドリが高難度の対角パスをライスとパーティの間を通してハーフスペースへ供給。",
      metric: "パス難易度: 78%",
      category: "tactical",
    },
    {
      timeLabel: "28:45",
      timeSec: 1725,
      title: "サリバの決死のゴール前クリア",
      summary: "サリバが6ヤードボックス内へのスライディングでハーランドの決定打を阻止。",
      metric: "阻止xT: 0.34",
      category: "tactical",
    },
    {
      timeLabel: "42:10",
      timeSec: 2530,
      title: "ゴール：アーリング・ハーランド先制点",
      summary: "ハーランドがデ・ブライネの折り返しに合わせ、右隅へ強烈なシュートを突き刺す。",
      metric: "108.4 km/h • 0.78 xG",
      category: "goal",
    },
    {
      timeLabel: "44:55",
      timeSec: 2695,
      title: "ゴール：ブカヨ・サカ電撃カウンター同点弾",
      summary: "サカが高速カウンターで右サイドを独走し、エデルソンを破って同点。",
      metric: "33.8 km/h • 4タッチ",
      category: "goal",
    },
    {
      timeLabel: "45'+2",
      timeSec: 2700,
      title: "前半終了ホイッスル＆戦術評価",
      summary: "1-1の同点で折り返し；シティがポゼッションを掌握し、アーセナルはカウンターで脅威を与える。",
      metric: "ピッチコントロール: MCI 61% - ARS 39%",
      category: "whistle",
    },
  ],
  ar: [
    {
      timeLabel: "00:00",
      timeSec: 0,
      title: "صافرة البداية والتمركز التكتيكي",
      summary: "مانشستر سيتي يبدأ بشكل بناء 3-2-4-1 ضد كتلة أرسنال المتوسطة 4-4-2.",
      metric: "التشكيل الأولي 4-3-3 مقابل 4-2-3-1",
      category: "tactical",
    },
    {
      timeLabel: "14:20",
      timeSec: 860,
      title: "ضغط الكتلة المنخفضة وتمريرة رودري الكاسرة",
      summary: "رودري يمرر كرة قطرية صعبة بين رايس وبارتي نحو نصف المساحة.",
      metric: "صعوبة التمرير: 78%",
      category: "tactical",
    },
    {
      timeLabel: "28:45",
      timeSec: 1725,
      title: "تشتيت ساليبا الفدائي داخل منطقة الجزاء",
      summary: "ساليبا يمنع هدفاً محققاً لهالاند باعتراض انزلاقي حاسم داخل الست ياردات.",
      metric: "تهديد متوقع محبط: 0.34",
      category: "tactical",
    },
    {
      timeLabel: "42:10",
      timeSec: 2530,
      title: "هدف: إرلينغ هالاند يفتتح التسجيل",
      summary: "هالاند يستقبل عرضية دي بروين المتقنة ويسدد كرة صاروخية في أعلى الزاوية اليمنى.",
      metric: "108.4 كم/س • 0.78 xG",
      category: "goal",
    },
    {
      timeLabel: "44:55",
      timeSec: 2695,
      title: "هدف: بوكايو ساكا يعادل النتيجة بمرتدة خاطفة",
      summary: "ساكا ينطلق كالسهم على الجناح الأيمن في تحول مرتد ويسكن الكرة شباك إيدرسون.",
      metric: "33.8 كم/س • 4 لمسات",
      category: "goal",
    },
    {
      timeLabel: "45'+2",
      timeSec: 2700,
      title: "صافرة نهاية الشوط الأول والتقييم التكتيكي",
      summary: "نهاية الشوط الأول بالتعادل الإيجابي؛ سيطرة ميدانية لسيتي وخطورة مرتدة لأرسنال.",
      metric: "السيطرة على الملعب: MCI 61% - ARS 39%",
      category: "whistle",
    },
  ],
};

const TELEPROMPTER_SCRIPT_BY_LANG: Record<
  SupportedLanguage,
  Array<{ cue: string; speaker: string; text: string }>
> = {
  en: [
    {
      cue: "00:00 - ANCHOR STUDIO INTRO",
      speaker: "Studio Anchor",
      text: "Welcome back to Premier League Studio powered by Gamoventure. At the interval here at Etihad Stadium, Manchester City and Arsenal are locked at 1-1 following an intensely tactical opening forty-five minutes of premier championship football.",
    },
    {
      cue: "00:30 - TACTICAL MACRO-ARC: LOW-BLOCK SIEGE",
      speaker: "Lead Tactical Analyst",
      text: "The first half unfolded as a textbook low-block siege. Manchester City held sixty-one percent pitch control, continuously recycling possession across the final third and squeezing Arsenal's defensive block into an eighteen-meter corridor. Arsenal maintained tactical discipline under relentless territorial pressure.",
    },
    {
      cue: "01:05 - THE BREAKTHROUGH: E. HAALAND 42'",
      speaker: "Studio Anchor & Analyst",
      text: "The breakthrough came in the forty-second minute. A patient fourteen-pass sequence saw Kevin De Bruyne slip a pinpoint delivery to Erling Haaland, who unleashed a ferocious one-hundred-and-eight kilometer per hour strike. With an expected goals value of zero-point-seven-eight, it was clinical finishing of the highest order.",
    },
    {
      cue: "01:40 - THE EQUALIZER: B. SAKA 45+1'",
      speaker: "Studio Anchor",
      text: "Yet Arsenal responded with devastating speed right before the whistle. In a rapid four-touch transition from their defensive box, Bukayo Saka clocked the match's top sprint velocity at thirty-three-point-eight kilometers per hour, beating Ederson across goal to restore emotional and tactical equilibrium.",
    },
    {
      cue: "02:15 - SECOND-HALF KEYS: RECOVERY & HIGH PRESS EXHAUSTION",
      speaker: "Lead Tactical Analyst",
      text: "As we look ahead to the second half, the central tactical question will be physical endurance. Can Mikel Arteta's side maintain their ninety-four percent pressing intensity without suffering high-press exhaustion, or will City's control over tempo gradually wear down the Gunners' resistance?",
    },
    {
      cue: "02:50 - TACTICAL VERDICT & RE-JOIN",
      speaker: "Studio Anchor",
      text: "A blockbuster second half awaits. Stay tuned to Gamoventure Premier League Studio for continuous live spatial tracking and tactical intelligence as the teams return to the pitch.",
    },
  ],
  es: [
    {
      cue: "00:00 - INTRODUCCIÓN EN PLATÓ",
      speaker: "Presentador de Estudio",
      text: "Bienvenidos de nuevo a Premier League Studio de Gamoventure. En el descanso en el Etihad Stadium, Manchester City y Arsenal empatan 1-1 tras unos cuarenta y cinco minutos iniciales de máxima exigencia táctica.",
    },
    {
      cue: "00:30 - MACRO-ARCO TÁCTICO: ASEDIO EN BLOQUE BAJO",
      speaker: "Analista Táctico Principal",
      text: "El primer tiempo fue un auténtico asedio a un bloque bajo. El Manchester City acumuló el sesenta y un por ciento de control de campo, circulando el balón en el último tercio y encerrando al Arsenal en un pasillo de apenas dieciocho metros.",
    },
    {
      cue: "01:05 - EL DESENLACE: E. HAALAND 42'",
      speaker: "Presentador y Analista",
      text: "El primer gol llegó en el minuto cuarenta y dos. Tras una secuencia paciente de catorce pases, Kevin De Bruyne asistió a Erling Haaland, quien fusiló con un disparo a ciento ocho kilómetros por hora y 0.78 xG.",
    },
    {
      cue: "01:40 - EL EMPATE: B. SAKA 45+1'",
      speaker: "Presentador de Estudio",
      text: "Sin embargo, el Arsenal contestó al instante. En una transición vertiginosa de solo cuatro toques, Bukayo Saka registró la mayor velocidad punta del partido con treinta y tres coma ocho kilómetros por hora para batir a Ederson.",
    },
    {
      cue: "02:15 - CLAVES DEL SEGUNDO TIEMPO: RESISTENCIA Y PRESIÓN ALTA",
      speaker: "Analista Táctico Principal",
      text: "De cara a la segunda mitad, el dilema clave será la resistencia física. ¿Podrá el equipo de Arteta sostener su noventa y cuatro por ciento de intensidad sin acusar el desgaste, o impondrá el City su control del ritmo?",
    },
    {
      cue: "02:50 - VEREDICTO Y REGRESO AL PARTIDO",
      speaker: "Presentador de Estudio",
      text: "Nos espera un segundo tiempo apasionante. Continúen en Premier League Studio para el seguimiento espacial en vivo mientras los equipos regresan al terreno de juego.",
    },
  ],
  fr: [
    {
      cue: "00:00 - INTRODUCTION PLATEAU",
      speaker: "Présentateur Studio",
      text: "Bienvenue sur Premier League Studio motorisé par Gamoventure. À la mi-temps à l'Etihad Stadium, Manchester City et Arsenal se neutralisent 1-1 après un premier acte d'une immense intensité tactique.",
    },
    {
      cue: "00:30 - ARC TACTIQUE : SIÈGE DU BLOC BAS",
      speaker: "Analyste Tactique",
      text: "Cette première période s'est résumée à un siège méticuleux. Manchester City a confisqué soixante-et-un pour cent du terrain, faisant tourner aux abords de la surface adverse et comprimant Arsenal dans dix-huit mètres de profondeur.",
    },
    {
      cue: "01:05 - L'OUVERTURE DU SCORE : E. HAALAND 42'",
      speaker: "Présentateur & Analyste",
      text: "Le verrou a sauté à la quarante-deuxième minute. Au terme de quatorze passes, Kevin De Bruyne a trouvé Erling Haaland, auteur d'un missile à cent-huit kilomètres par heure pour un xG de zéro virgule soixante-dix-huit.",
    },
    {
      cue: "01:40 - L'ÉGALISATION : B. SAKA 45+1'",
      speaker: "Présentateur Studio",
      text: "Arsenal a répliqué avec un éclair chirurgical juste avant la pause. En quatre touches de balle, Bukayo Saka a été chronométré à trente-trois virgule huit kilomètres par heure pour tromper Ederson.",
    },
    {
      cue: "02:15 - CLÉS DE LA SECONDE PÉRIODE : ENDURANCE DU PRESSING",
      speaker: "Analyste Tactique",
      text: "Pour le second acte, la condition physique sera déterminante. Les hommes de Mikel Arteta pourront-ils maintenir quatre-vingt-quatorze pour cent d'intensité sans fléchir face à l'usure imposée par le tempo de City ?",
    },
    {
      cue: "02:50 - VERDICT & RETOUR AU DIRECT",
      speaker: "Présentateur Studio",
      text: "Une seconde période palpitante s'annonce. Restez sur Gamoventure Premier League Studio pour suivre le tracking spatial en direct.",
    },
  ],
  ja: [
    {
      cue: "00:00 - スタジオオープニング",
      speaker: "スタジオアンカー",
      text: "エティハド・スタジアムからお送りするプレミアリーグ・スタジオ。前半を終えてマンチェスター・シティとアーセナルは1-1の同点。極めて密度の高い戦術的攻防が繰り広げられました。",
    },
    {
      cue: "00:30 - 戦術マクロアーク：低位ブロック包囲網",
      speaker: "戦術アナリスト",
      text: "前半は教科書通りの低位ブロック包囲戦となりました。シティがピッチコントロール61%を保持して中央を締め付け、アーセナルは自陣18mエリアでの強固な守備規律を保ちました。",
    },
    {
      cue: "01:05 - 先制の瞬間：E・ハーランド 42分",
      speaker: "アンカー＆アナリスト",
      text: "42分、均衡が破れました。14本のパスワークからデ・ブライネの正確無比なラストパスをハーランドが時速108.4kmの弾丸シュート（0.78 xG）で沈めました。",
    },
    {
      cue: "01:40 - 電撃の同点弾：B・サカ 45+1分",
      speaker: "スタジオアンカー",
      text: "しかしアーセナルは電光石火のカウンターで応酬。自陣深くからわずか4タッチ、試合最高速度の時速33.8kmで疾走したサカがエデルソンを破り、試合を振り出しに戻しました。",
    },
    {
      cue: "02:15 - 後半の焦点：フィジカル持久力とハイプレスの維持",
      speaker: "戦術アナリスト",
      text: "後半の最大の焦点は運動量です。アルテタ監督率いるアーセナルが94%のプレッシング強度を維持し続けられるか、それともシティがテンポ支配でこじ開けるかが勝負の分かれ目です。",
    },
    {
      cue: "02:50 - 戦術的総括とピッチ復帰",
      speaker: "スタジオアンカー",
      text: "運命の後半戦へ。リアルタイム空間追跡と戦術インテリジェンスをお届けするプレミアリーグ・スタジオでお楽しみください。",
    },
  ],
  ar: [
    {
      cue: "00:00 - مقدمة استوديو التحليل",
      speaker: "مقدم الاستوديو",
      text: "أهلاً بكم من جديد في استوديو الدوري الإنجليزي الممتاز من غاموفنتشر. في استراحة ما بين الشوطين هنا في ملعب الاتحاد، يتعادل مانشستر سيتي وأرسنال بنتيجة 1-1 بعد شوط أول شهد قمة التكتيك الكروي.",
    },
    {
      cue: "00:30 - المسار التكتيكي العام: حصار التكتل الدفاعي",
      speaker: "كبير المحللين التكتيكيين",
      text: "الشوط الأول كان درساً كلاسيكياً في حصار الكتلة المنخفضة. فرض السيتي سيطرة ميدانية بنسبة 61% وضغط أرسنال في عمق ثمانية عشر متراً، بينما التزم المدفعجية بانضباط دفاعي صارم.",
    },
    {
      cue: "01:05 - لحظة كسر التعادل: إرلينغ هالاند 42'",
      speaker: "مقدم الاستوديو والمحلل",
      text: "الهدف الافتتاحي جاء في الدقيقة 42 عبر سلسلة من 14 تمريرة توجها دي بروين بتمريرة حاسمة لهالاند الذي أطلق قذيفة بسرعة 108.4 كم/س بمعدل أهداف متوقعة 0.78 xG.",
    },
    {
      cue: "01:40 - الرد الحاسم: بوكايو ساكا 45+1'",
      speaker: "مقدم الاستوديو",
      text: "لكن أرسنال رد بصاعقة مرتدة خاطفة؛ في أربع لمسات فقط سجل ساكا أسرع انطلاقة في اللقاء بسرعة 33.8 كم/س ليتجاوز إيدرسون ويعيد التوازن للمواجهة.",
    },
    {
      cue: "02:15 - مفاتيح الشوط الثاني: استمرارية اللياقة والضغط العالي",
      speaker: "كبير المحللين التكتيكيين",
      text: "مع انطلاق الشوط الثاني، التساؤل التكتيكي الأبرز هو الصمود البدني؛ هل يستطيع أرسنال الحفاظ على وتيرة ضغط تبلغ 94%، أم أن سيطرة سيتي على الإيقاع ستنهك دفاعات الخصم؟",
    },
    {
      cue: "02:50 - الخلاصة التكتيكية والعودة للملعب",
      speaker: "مقدم الاستوديو",
      text: "شوط ثانٍ ناري بانتظارنا. ابقوا معنا في استوديو غاموفنتشر لمتابعة التحليلات اللحظية والبيانات المكانية الحية.",
    },
  ],
};

const DIGITAL_ARTICLE_BY_LANG: Record<SupportedLanguage, string> = {
  en: `# Manchester City 1 - 1 Arsenal: Half-Time Tactical Breakdown
**Etihad Stadium | Premier League Matchweek | Gamoventure Studio Intelligence**

### First-Half Summary
At the interval at the Etihad Stadium, Manchester City and Arsenal remain deadlocked at 1-1 after a masterclass in tactical contrast. Pep Guardiola's Manchester City dominated early territorial possession (61% Pitch Control), attempting to dismantle Arsenal's compact 4-4-2 low block.

### Key Moments:
- **42' - E. Haaland (Man City)**: A 14-pass build-up sequence was converted with an emphatic 108.4 km/h strike (0.78 xG, Post-Shot xG 0.94).
- **45+1' - B. Saka (Arsenal)**: A lightning 4-touch counter-transition reached a match-high velocity of 33.8 km/h to slip past Ederson and equalize.

### Tactical Metrics:
- **Pitch Control Dominance**: Man City 61% • Arsenal 39%
- **Pass Difficulty Rating (PDR)**: 86% vs 79%
- **High Press Intensity**: Arsenal 94% work rate sustained over first 45 minutes

*Report generated synthetically by Gamoventure Premier League Studio Insights Engine.*`,

  es: `# Manchester City 1 - 1 Arsenal: Balance Táctico al Descanso
**Etihad Stadium | Premier League | Gamoventure Studio Intelligence**

### Resumen del Primer Tiempo
Al descanso en el Etihad Stadium, Manchester City y Arsenal igualan 1-1 tras una lección de contraste táctico. El Manchester City dominó la posesión territorial (61% de Control del Campo), buscando resquebrajar el ordenado bloque bajo 4-4-2 del Arsenal.

### Momentos Clave:
- **42' - E. Haaland (Man City)**: Una secuencia de 14 pases culminó con un zapatazo a 108.4 km/h (0.78 xG, Post-Shot xG 0.94).
- **45+1' - B. Saka (Arsenal)**: Una transición fulgurante de 4 toques alcanzó los 33.8 km/h para batir a Ederson y empatar el encuentro.

### Métricas Tácticas:
- **Dominio de Control del Campo**: Man City 61% • Arsenal 39%
- **Índice de Dificultad de Pase (PDR)**: 86% vs 79%
- **Intensidad de Presión Alta**: 94% sostenido por el Arsenal durante los primeros 45 minutos

*Informe generado sintéticamente por Gamoventure Premier League Studio Insights Engine.*`,

  fr: `# Manchester City 1 - 1 Arsenal : Bilan Tactique à la Mi-Temps
**Etihad Stadium | Premier League | Gamoventure Studio Intelligence**

### Résumé de la Première Période
À la pause à l'Etihad Stadium, Manchester City et Arsenal se neutralisent 1-1 au terme d'une confrontation tactique intense. Manchester City a confisqué le ballon (61% de contrôle du terrain) face au bloc bas compact en 4-4-2 d'Arsenal.

### Moments Clés :
- **42' - E. Haaland (Man City)** : Une séquence de 14 passes conclue par une frappe surpuissante à 108,4 km/h (0,78 xG).
- **45+1' - B. Saka (Arsenal)** : Un contre supersonique en 4 touches flashé à 33,8 km/h pour tromper Ederson.

### Métriques Tactiques :
- **Contrôle du Terrain** : Man City 61% • Arsenal 39%
- **Pass Difficulty Rating (PDR)** : 86% vs 79%
- **Intensité du Pressing** : 94% maintenu par Arsenal sur les 45 premières minutes

*Rapport généré synthétiquement par Gamoventure Premier League Studio Insights Engine.*`,

  ja: `# マンチェスター・シティ 1 - 1 アーセナル：前半戦術総括
**エティハド・スタジアム | プレミアリーグ | Gamoventure Studio Intelligence**

### 前半サマリー
エティハド・スタジアムでの前半は1-1の拮抗した展開。マンチェスター・シティが圧倒的なテリトリー支配（ピッチコントロール61%）でアーセナルの4-4-2低位ブロックに猛攻を仕掛けました。

### 決定的一瞬：
- **42分 - E・ハーランド（マンチェスター・シティ）**：14本のパス連係から時速108.4kmの豪快な先制シュート（0.78 xG）。
- **45+1分 - B・サカ（アーセナル）**：わずか4タッチの電光石火カウンター、試合最速33.8km/hのスプリントで同点弾。

### 戦術指標：
- **ピッチコントロール**：マンチェスター・シティ 61% • アーセナル 39%
- **パス難易度レーティング (PDR)**：86% vs 79%
- **ハイプレス強度**：アーセナルが前半通じて94%のワークレートを維持

*本レポートはGamoventure Premier League Studio Insights Engineにより自動生成されました。*`,

  ar: `# مانشستر سيتي 1 - 1 أرسنال: التحليل التكتيكي للشوط الأول
**ملعب الاتحاد | الدوري الإنجليزي الممتاز | استوديو غاموفنتشر التحليلي**

### ملخص الشوط الأول
مع صافرة نهاية الشوط الأول في ملعب الاتحاد، يخيم التعادل 1-1 على قمة التكتيك الكروي. فرض مانشستر سيتي سيطرة ميدانية ساحقة (61% سيطرة على الملعب) في محاولة لاختراق التكتل الدفاعي المحكم لأرسنال 4-4-2.

### أبرز اللحظات:
- **42' - إرلينغ هالاند (مانشستر سيتي)**: هجمة منسقة من 14 تمريرة تكللت بتسديدة صاروخية بسرعة 108.4 كم/س (0.78 xG).
- **45+1' - بوكايو ساكا (أرسنال)**: مرتدة خاطفة من 4 لمسات بلغت سرعتها 33.8 كم/س لتستقر في شباك إيدرسون.

### المؤشرات التكتيكية:
- **السيطرة على الملعب**: مانشستر سيتي 61% • أرسنال 39%
- **مؤشر صعوبة التمرير (PDR)**: 86% مقابل 79%
- **كثافة الضغط العالي**: معدل جهد بدني لأرسنال بلغ 94% طوال الـ 45 دقيقة الأولى
 
*تقرير تحليلي تم إنشاؤه بواسطة محرك استوديو غاموفنتشر للدوري الإنجليزي الممتاز.*`,
};

function synthesizeChaptersFromEvents(events: MatchEvent[]): ChapterMarker[] {
  const milestoneEvents = events.filter((e) =>
    ["goal", "save", "punch", "claim", "red_card", "key_pass", "cross", "clearance", "block", "inflection"].includes(e.type)
  );

  if (milestoneEvents.length < 2) {
    return [];
  }

  return milestoneEvents.map((e) => {
    let cat: ChapterMarker["category"] = "tactical";
    if (e.type === "goal") cat = "goal";
    else if (e.type === "save" || e.type === "punch" || e.type === "claim") cat = "keeper";
    else if (e.type === "clearance" || e.type === "block" || e.type === "tackle") cat = "defense";
    else if (e.type === "red_card" || e.type === "yellow_card") cat = "whistle";
    else cat = "tactical";

    const metric = e.xG !== undefined
      ? `${e.xG.toFixed(2)} xG`
      : e.speedKmH
      ? `${e.speedKmH.toFixed(1)} km/h`
      : e.pdr !== undefined
      ? `PDR: ${Math.round(e.pdr)}%`
      : e.score && e.type === "goal"
      ? `${e.score.home} - ${e.score.away}`
      : (e.pitchSector ?? "Match Milestone");

    return {
      timeLabel: e.matchClock,
      timeSec: Math.round((e.timestampMs || 0) / 1000),
      title: e.description || `${(e.actorId ?? "Player").toUpperCase()} ${e.type.toUpperCase()}`,
      summary: e.pitchSector
        ? `Action executed in ${e.pitchSector} with decisive tactical impact.`
        : `Significant match event recorded at ${e.matchClock}.`,
      metric,
      category: cat,
    };
  });
}

export const StudioRecapModal: React.FC<StudioRecapModalProps> = ({ isOpen, onClose }) => {
  const score = useBaseMemory((s) => s.score);
  const matchClock = useBaseMemory((s) => s.matchClock);
  const selectedLanguage = useBaseMemory((s) => s.selectedLanguage);
  const matchEvents = useBaseMemory((s) => s.matchEvents);

  const [activeTab, setActiveTab] = useState<"teleprompter" | "chapters" | "article">("teleprompter");
  const [isPrompterScrolling, setIsPrompterScrolling] = useState(false);
  const [prompterSpeed, setPrompterSpeed] = useState<number>(1.0);
  const [fontSize, setFontSize] = useState<"standard" | "large" | "prompter">("large");
  const [copiedNotification, setCopiedNotification] = useState(false);

  const prompterContainerRef = useRef<HTMLDivElement | null>(null);

  // Teleprompter Auto-Scroll Loop
  useEffect(() => {
    let animId: number;
    if (isPrompterScrolling && activeTab === "teleprompter") {
      const scrollStep = () => {
        if (prompterContainerRef.current) {
          prompterContainerRef.current.scrollTop += 0.6 * prompterSpeed;
          // Loop back to top if reached bottom
          if (
            prompterContainerRef.current.scrollTop + prompterContainerRef.current.clientHeight >=
            prompterContainerRef.current.scrollHeight - 5
          ) {
            prompterContainerRef.current.scrollTop = 0;
          }
        }
        animId = requestAnimationFrame(scrollStep);
      };
      animId = requestAnimationFrame(scrollStep);
    }

    return () => cancelAnimationFrame(animId);
  }, [isPrompterScrolling, prompterSpeed, activeTab]);

  // Keyboard Escape listener to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const synthesizedChapters = synthesizeChaptersFromEvents(matchEvents);
  const fallbackChapters = CHAPTER_MARKERS_BY_LANG[selectedLanguage] || CHAPTER_MARKERS_BY_LANG.en;
  const chapters = synthesizedChapters.length >= 2 ? synthesizedChapters : fallbackChapters;
  const teleprompterScript = TELEPROMPTER_SCRIPT_BY_LANG[selectedLanguage] || TELEPROMPTER_SCRIPT_BY_LANG.en;
  const digitalArticleMarkdown = DIGITAL_ARTICLE_BY_LANG[selectedLanguage] || DIGITAL_ARTICLE_BY_LANG.en;

  const handleSeekChapter = (sec: number) => {
    baseMemory.setMatchClock(sec);
  };

  const handleCopyPrompter = () => {
    const textToCopy = teleprompterScript.map(
      (c) => `=== ${c.cue} (${c.speaker}) ===\n${c.text}\n`
    ).join("\n");
    navigator.clipboard.writeText(textToCopy);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(2, 6, 23, 0.92)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999999,
        padding: "max(12px, env(safe-area-inset-top, 12px)) 12px max(12px, env(safe-area-inset-bottom, 12px)) 12px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1050px",
          maxHeight: "calc(100dvh - 24px)",
          height: "92dvh",
          backgroundColor: "var(--studio-panel-bg)",
          border: "1px solid var(--studio-panel-border)",
          borderRadius: "16px",
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.95), 0 0 30px rgba(124, 58, 237, 0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header Bar with High-Visibility Red/White Close Button */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--studio-panel-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(15, 23, 42, 0.98)",
            flexWrap: "nowrap",
            gap: "10px",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px", minWidth: 0, flex: "1 1 auto" }}>
            <span
              style={{
                backgroundColor: "#7c3aed",
                color: "#ffffff",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.5px",
                padding: "2px 7px",
                borderRadius: "5px",
                textTransform: "uppercase",
                display: "inline-block",
                flexShrink: 0,
              }}
            >
              Gamoventure
            </span>
            <div style={{ minWidth: 0, width: "100%" }}>
              <div style={{ fontSize: "12.5px", fontWeight: 900, color: "var(--ion-text-color)", lineHeight: "1.25", whiteSpace: "normal" }}>
                Half-Time Studio Teleprompter
              </div>
              <div style={{ fontSize: "9.5px", color: "var(--studio-subtext)", marginTop: "2px", lineHeight: "1.2", whiteSpace: "normal" }}>
                {score.homeTeam} 1 - 1 {score.awayTeam} • Interval (45'+2')
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {copiedNotification && (
              <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px" }}>
                <IonIcon icon={checkmarkCircleOutline} />
                Copied!
              </span>
            )}
            <button
              onClick={handleCopyPrompter}
              style={{
                backgroundColor: "var(--studio-inner-bg)",
                border: "1px solid var(--studio-panel-border)",
                borderRadius: "6px",
                padding: "5px 8px",
                color: "var(--ion-text-color)",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Copy Teleprompter Script"
            >
              <IonIcon icon={copyOutline} />
              <span style={{ fontSize: "10px" }}>Copy</span>
            </button>

            {/* Clean top-right close '✕' button */}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                color: "#f8fafc",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
                flexShrink: 0,
                marginLeft: "4px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ef4444";
                e.currentTarget.style.borderColor = "#ef4444";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
                e.currentTarget.style.color = "#f8fafc";
              }}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Controls with Permanent Grey Scroll Line */}
        <div
          style={{
            padding: "8px 14px",
            backgroundColor: "var(--studio-inner-bg)",
            borderBottom: "1px solid var(--studio-panel-border)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ flex: "1 1 320px", maxWidth: "100%", minWidth: 0 }}>
              <StudioChipScroller gap="8px" marginTopTrack={6} alwaysShowTrack={true}>
                <button
                  onClick={() => setActiveTab("teleprompter")}
                  style={{
                    backgroundColor: activeTab === "teleprompter" ? "var(--ion-color-primary)" : "transparent",
                    border: activeTab === "teleprompter" ? "1px solid var(--ion-color-primary)" : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    color: activeTab === "teleprompter" ? "#ffffff" : "var(--studio-subtext)",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <IonIcon icon={micOutline} />
                  <span>Teleprompter</span>
                </button>

                <button
                  onClick={() => setActiveTab("chapters")}
                  style={{
                    backgroundColor: activeTab === "chapters" ? "var(--ion-color-primary)" : "transparent",
                    border: activeTab === "chapters" ? "1px solid var(--ion-color-primary)" : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    color: activeTab === "chapters" ? "#ffffff" : "var(--studio-subtext)",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <IonIcon icon={bookmarkOutline} />
                  <span>Chapters</span>
                </button>

                <button
                  onClick={() => setActiveTab("article")}
                  style={{
                    backgroundColor: activeTab === "article" ? "var(--ion-color-primary)" : "transparent",
                    border: activeTab === "article" ? "1px solid var(--ion-color-primary)" : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    color: activeTab === "article" ? "#ffffff" : "var(--studio-subtext)",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <IonIcon icon={documentTextOutline} />
                  <span>Publication</span>
                </button>
              </StudioChipScroller>
            </div>

            {/* Teleprompter Playback & Font Size Controls (Shown when on prompter tab) */}
            {activeTab === "teleprompter" && (
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                {/* Font Size Pills */}
                <div style={{ display: "flex", alignItems: "center", gap: "3px", backgroundColor: "rgba(255,255,255,0.05)", padding: "2px", borderRadius: "6px" }}>
                  <button
                    onClick={() => setFontSize("standard")}
                    style={{
                      background: fontSize === "standard" ? "var(--ion-color-primary)" : "transparent",
                      border: "none",
                      borderRadius: "4px",
                      color: fontSize === "standard" ? "#ffffff" : "#94a3b8",
                      padding: "3px 7px",
                      fontSize: "9px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setFontSize("large")}
                    style={{
                      background: fontSize === "large" ? "var(--ion-color-primary)" : "transparent",
                      border: "none",
                      borderRadius: "4px",
                      color: fontSize === "large" ? "#ffffff" : "#94a3b8",
                      padding: "3px 7px",
                      fontSize: "9px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Large
                  </button>
                  <button
                    onClick={() => setFontSize("prompter")}
                    style={{
                      background: fontSize === "prompter" ? "var(--ion-color-primary)" : "transparent",
                      border: "none",
                      borderRadius: "4px",
                      color: fontSize === "prompter" ? "#ffffff" : "#94a3b8",
                      padding: "3px 7px",
                      fontSize: "9px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    24px
                  </button>
                </div>

                {/* Speed Pills */}
                <div style={{ display: "flex", alignItems: "center", gap: "3px", backgroundColor: "rgba(255,255,255,0.05)", padding: "2px", borderRadius: "6px" }}>
                  {[0.5, 1.0, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setPrompterSpeed(s)}
                      style={{
                        background: prompterSpeed === s ? "#38bdf8" : "transparent",
                        border: "none",
                        borderRadius: "4px",
                        color: prompterSpeed === s ? "#020617" : "#94a3b8",
                        padding: "3px 6px",
                        fontSize: "9px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* Scroll Auto Play/Pause */}
                <button
                  onClick={() => setIsPrompterScrolling(!isPrompterScrolling)}
                  style={{
                    backgroundColor: isPrompterScrolling ? "#ef4444" : "#10b981",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 9px",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <IonIcon icon={isPrompterScrolling ? pauseOutline : playOutline} />
                  <span>{isPrompterScrolling ? "Pause" : "Auto-Scroll"}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Main Body: Exactly ONE visible grey scroll line per screen */}
        <div
          className={`studio-recap-modal-body ${activeTab !== "teleprompter" ? "studio-visible-scrollbar" : ""}`}
          style={{
            padding: "16px 14px",
            overflowY: activeTab !== "teleprompter" ? "auto" : "hidden",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* TAB 1: Studio Teleprompter */}
          {activeTab === "teleprompter" && (
            <div
              ref={prompterContainerRef}
              dir={selectedLanguage === "ar" ? "rtl" : "ltr"}
              className="studio-visible-scrollbar"
              style={{
                flex: 1,
                height: "100%",
                maxHeight: "58dvh",
                minHeight: "260px",
                overflowY: "auto",
                padding: "16px 16px 16px 14px",
                backgroundColor: "#020617",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {teleprompterScript.map((segment, idx) => (
                <div
                  key={idx}
                  style={{
                    borderLeft: "3px solid #7c3aed",
                    paddingLeft: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        backgroundColor: "rgba(124, 58, 237, 0.25)",
                        color: "#c084fc",
                        fontSize: "9px",
                        fontWeight: 900,
                        fontFamily: "monospace",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {segment.cue}
                    </span>
                    <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>
                      Speaker: {segment.speaker}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: "#f8fafc",
                      lineHeight: "1.65",
                      fontWeight: 600,
                      fontSize:
                        fontSize === "prompter"
                          ? "22px"
                          : fontSize === "large"
                          ? "17px"
                          : "14px",
                      letterSpacing: "0.2px",
                    }}
                  >
                    {segment.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: Streaming Video Chapter Markers */}
          {activeTab === "chapters" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                {chapters.map((ch, idx) => {
                  const isCurrent = Math.abs(matchClock - ch.timeSec) < 300;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSeekChapter(ch.timeSec)}
                      style={{
                        backgroundColor: isCurrent ? "rgba(124, 58, 237, 0.2)" : "var(--studio-inner-bg)",
                        border: isCurrent ? "1.5px solid var(--ion-color-primary)" : "1px solid var(--studio-panel-border)",
                        borderRadius: "10px",
                        padding: "12px 14px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 900,
                            fontFamily: "monospace",
                            color: "var(--ion-color-primary)",
                          }}
                        >
                          {ch.timeLabel}
                        </span>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor:
                              ch.category === "goal"
                                ? "rgba(255, 214, 0, 0.2)"
                                : ch.category === "tactical"
                                ? "rgba(0, 229, 255, 0.2)"
                                : ch.category === "keeper"
                                ? "rgba(236, 72, 153, 0.2)"
                                : ch.category === "defense"
                                ? "rgba(59, 130, 246, 0.2)"
                                : "rgba(255, 255, 255, 0.1)",
                            color:
                              ch.category === "goal"
                                ? "#ffd600"
                                : ch.category === "tactical"
                                ? "#00e5ff"
                                : ch.category === "keeper"
                                ? "#ec4899"
                                : ch.category === "defense"
                                ? "#3b82f6"
                                : "#ffffff",
                          }}
                        >
                          {ch.metric}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--ion-text-color)" }}>
                        {ch.title}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--studio-subtext)", lineHeight: "1.4" }}>
                        {ch.summary}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Instant Digital Publication */}
          {activeTab === "article" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(digitalArticleMarkdown);
                    setCopiedNotification(true);
                    setTimeout(() => setCopiedNotification(false), 2000);
                  }}
                  style={{
                    backgroundColor: "var(--ion-color-primary)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    flexShrink: 0,
                  }}
                >
                  <IonIcon icon={copyOutline} />
                  <span>Copy Markdown</span>
                </button>
              </div>

              <div
                dir={selectedLanguage === "ar" ? "rtl" : "ltr"}
                style={{
                  backgroundColor: "#020617",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px",
                  padding: "16px",
                  color: "#e2e8f0",
                  fontSize: "12px",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                }}
              >
                {digitalArticleMarkdown}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
