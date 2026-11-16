import { HOME_ANIMATION_ALT, homeAnimationCss, homeAnimationPairs } from "@/lib/homeAnimation";
import HomeAnimationControl from "./HomeAnimationControl";
import HomeExampleSummary from "./HomeExampleSummary";

// Server Component passed through HomeClient's slot; the drawing never ships as JS.
export default function HomeChatAnimation() {
  const pairs = homeAnimationPairs();
  return (
    <HomeAnimationControl>
      <style>{homeAnimationCss(pairs)}</style>
      <noscript><style>{".home-chat-animation .home-chat-frame *{animation:none!important}"}</style></noscript>
      <p className="sr-only">{HOME_ANIMATION_ALT}</p>
      <div className="home-chat-frame" aria-hidden="true">
        <svg className="home-chat-map" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" focusable="false">
          <path d="M150-20 180 25 165 60 205 88 190 120 220 145 207 170 225 192 209 225 230 255 190 269 175 300 140 310 118 365 60 380 48 340 72 293 100 245 90 210 120 180 114 140 140 90 129 40Z" fill="#2D5A27" />
          <path d="m210 265 28 10 4 25 28 15 5 30 25 10-8 12-28-10-17-31-20-12Z" fill="#2D5A27" />
          <path d="M50 335Q190 160 380 85T610 30" stroke="#18324F" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" fill="none" />
          <circle cx="50" cy="335" r="5" fill="#A04B20" /><circle cx="520" cy="52" r="5" fill="#A04B20" />
        </svg>
        <div className="home-chat-map-labels" aria-hidden="true"><span>Wrocław</span><span>Barcelona</span></div>
        <div className="home-chat-crew" aria-hidden="true">{["A", "M", "T", "K"].map((initial) => <span key={initial}>{initial}</span>)}</div>
        <div className="home-chat-scene">
          <div className="home-chat-panel home-chat-left">
            <p className="home-chat-panel-title">Czat grupowy, dziś</p>
            <div className="home-chat-group">
              {pairs.map((pair) => (
                <p key={pair.key} className={`home-chat-bubble home-chat-question-${pair.key}`}>
                  <strong>{pair.name}:</strong>{" "}{pair.question}
                </p>
              ))}
            </div>
          </div>
          <div className="home-chat-panel home-chat-right">
            <p className="home-chat-panel-title">Włóczykij zbiera to tak</p>
            <HomeExampleSummary animated />
          </div>
        </div>
      </div>
    </HomeAnimationControl>
  );
}
