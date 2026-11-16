import { homeAnimationPairs } from "@/lib/homeAnimation";

// Shared illustrative product header and cost card, in hero and plan preview.
export default function HomeExampleSummary({ animated = false }: { animated?: boolean }) {
  const pairs = homeAnimationPairs().filter((pair) => animated || ["destination", "cost", "plan"].includes(pair.key));
  return (
    <div className="home-chat-product">
      {pairs.map((pair) => (
        <div key={pair.key} className={`home-chat-answer home-chat-${animated ? "answer" : "summary"}-${pair.key}`}>
          <p>{pair.answer}</p>
          {"detail" in pair && <p className="home-chat-total">{pair.detail}</p>}
        </div>
      ))}
    </div>
  );
}
