import { HOME_ANIMATION_ALT, homeAnimationPairs } from "@/lib/homeAnimation";
import HomeAnimationControl from "./HomeAnimationControl";
import HomeExampleSummary from "./HomeExampleSummary";

type Friend = "Ania" | "Marek" | "Tomek" | "Kuba";
const FRIENDS: Friend[] = ["Ania", "Marek", "Tomek", "Kuba"];

// Original railway-poster portraits. Symbols stay in the server-rendered drawing.
function Portraits() {
  return (
    <svg className="home-chat-symbols" aria-hidden="true" focusable="false">
      <defs>
        <symbol id="home-friend-Ania" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="32" fill="#18324F" />
          <path d="M12 44V25C12 3 48 2 51 26L54 47Z" fill="#1C1008" />
          <path d="M7 64V55Q10 43 32 43Q54 43 57 55V64" fill="#EB531E" />
          <path d="M25 38H39V48L32 53L25 48Z" fill="#F5EFE0" />
          <path d="M20 23Q30 25 40 16L44 26V33Q42 43 32 43Q21 42 20 32Z" fill="#F5EFE0" />
          <g fill="#1C1008"><circle cx="27" cy="30" r="1.5" /><circle cx="37" cy="30" r="1.5" /></g>
          <path d="M29 36H35" stroke="#1C1008" strokeWidth="1.5" />
        </symbol>
        <symbol id="home-friend-Marek" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="32" fill="#A04B20" />
          <path d="M5 64V55Q11 42 32 43Q53 42 59 55V64" fill="#18324F" />
          <path d="M20 23H44V34Q42 45 32 45Q22 44 20 34Z" fill="#F5EFE0" />
          <path d="M18 23Q17 8 32 8Q48 8 47 23ZM15 23H50V28H15Z" fill="#2D5A27" />
          <path d="M23 43L32 49L41 43L46 50L33 58L20 50Z" fill="#2D5A27" />
          <g fill="#1C1008"><circle cx="27" cy="32" r="1.5" /><circle cx="37" cy="32" r="1.5" /></g>
          <path d="M29 38H35" stroke="#1C1008" strokeWidth="1.5" />
        </symbol>
        <symbol id="home-friend-Tomek" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="32" fill="#2D5A27" />
          <path d="M5 64V55Q10 42 32 43Q55 43 59 55V64" fill="#A04B20" />
          <path d="M20 21H44V34Q42 45 32 45Q22 44 20 34Z" fill="#F5EFE0" />
          <path d="M17 26L15 17L21 18L23 8L29 13L35 7L39 13L47 12L48 27L41 22L23 24Z" fill="#1C1008" />
          <g stroke="#18324F" strokeWidth="2" fill="none"><path d="M29 31H35M19 30H23M41 30H45" /><circle cx="26" cy="32" r="5" /><circle cx="38" cy="32" r="5" /></g>
          <g fill="#1C1008"><circle cx="26" cy="32" r="1" /><circle cx="38" cy="32" r="1" /></g>
          <path d="M29 40H35" stroke="#1C1008" strokeWidth="1.5" />
          <path d="M26 47L32 53L38 47V64H26Z" fill="#F5EFE0" />
        </symbol>
        <symbol id="home-friend-Kuba" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="32" fill="#F5EFE0" />
          <path d="M5 64V55Q10 43 32 43Q54 43 59 55V64" fill="#2D5A27" />
          <path d="M20 22H44V34Q42 45 32 45Q22 44 20 34Z" fill="#F5EFE0" />
          <path d="M17 26Q13 12 28 11Q48 7 47 25L39 20L22 25Z" fill="#1C1008" />
          <path d="M20 43Q31 49 44 42L47 50L36 56L40 64H29L26 54L19 51Z" fill="#18324F" />
          <g fill="#1C1008"><circle cx="27" cy="31" r="1.5" /><circle cx="37" cy="31" r="1.5" /></g>
          <path d="M29 38H35" stroke="#1C1008" strokeWidth="1.5" />
        </symbol>
      </defs>
    </svg>
  );
}

function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return <svg className={`home-chat-avatar ${className}`} viewBox="0 0 64 64" focusable="false"><use href={`#home-friend-${name}`} /></svg>;
}

// Server Component: portraits and choreography never enter the client JS graph.
export default function HomeChatAnimation() {
  const pairs = homeAnimationPairs();
  const seen = new Set<string>();
  return (
    <HomeAnimationControl>
      <noscript><link rel="stylesheet" href="/home-chat-static.css" /></noscript>
      <p className="sr-only">{HOME_ANIMATION_ALT}</p>
      <div className="home-chat-frame" aria-hidden="true">
        <Portraits />
        <svg className="home-chat-map" viewBox="0 0 640 440" preserveAspectRatio="xMidYMid slice" focusable="false">
          <path d="M-40 390C30 240 110 410 240 310S430 140 690 190M-40 370C30 220 110 390 240 290S430 120 690 170M-40 350C30 200 110 370 240 270S430 100 690 150M-40 330C30 180 110 350 240 250S430 80 690 130M-40 310C30 160 110 330 240 230S430 60 690 110M-40 290C30 140 110 310 240 210S430 40 690 90" fill="none" stroke="#18324F" strokeWidth="1" />
          <path d="M42 30Q220 35 320 220T598 410" stroke="#18324F" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" fill="none" />
          <circle cx="42" cy="30" r="5" fill="#A04B20" /><circle cx="598" cy="410" r="5" fill="#A04B20" />
        </svg>
        <div className="home-chat-map-labels"><span>Wrocław</span><span>Barcelona</span></div>
        <div className="home-chat-scene">
          <div className="home-chat-panel home-chat-left">
            <p className="home-chat-panel-title">Czat grupowy, dziś</p>
            <div className="home-chat-phone">
              <div className="home-chat-phone-header">
                <div className="home-chat-miniatures">{FRIENDS.map((name) => <Avatar key={name} name={name} />)}</div>
                <div><p>Grudniowy wyjazd</p><span className="home-chat-online">online</span></div>
              </div>
              <div className="home-chat-group">
                {pairs.map((pair) => {
                  const first = !seen.has(pair.name);
                  seen.add(pair.name);
                  return (
                    <div key={pair.key} className={`home-chat-row home-chat-row-${pair.key}`}>
                      <Avatar name={pair.name} className="home-chat-author" />
                      <div className="home-chat-typing"><span /><span /><span /></div>
                      <div className={`home-chat-message home-chat-question-${pair.key}`}>
                        {first && <p className="home-chat-name">{pair.name}</p>}
                        <div className="home-chat-bubble">
                          <p>{pair.question}</p>
                        </div>
                        <p className="home-chat-time"><time>{pair.time}</time></p>
                      </div>
                    </div>
                  );
                })}
                <div className="home-chat-row home-chat-row-reaction">
                  <Avatar name="Kuba" className="home-chat-author" />
                  <div className="home-chat-typing"><span /><span /><span /></div>
                  <div className="home-chat-message home-chat-question-reaction">{!seen.has("Kuba") && <p className="home-chat-name">Kuba</p>}<p className="home-chat-reaction">+1 <span className="home-chat-delivered">dostarczono</span></p><p className="home-chat-time"><time>18:04</time></p></div>
                </div>
              </div>
            </div>
          </div>
          <div className="home-chat-panel home-chat-right">
            <p className="home-chat-panel-title">Włóczykij zbiera to tak</p>
            <div className="home-chat-product-brand"><span>Włóczykij</span><span>Scenka</span></div>
            <div className="home-chat-response">
              <div className="home-chat-connectors">{pairs.map((pair) => <svg key={pair.key} className={`home-chat-connector home-chat-connector-${pair.key}`} viewBox="0 0 24 16" focusable="false"><path d="M0 8H22M16 2L22 8L16 14" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>)}</div>
              <HomeExampleSummary animated />
            </div>
          </div>
        </div>
      </div>
    </HomeAnimationControl>
  );
}
