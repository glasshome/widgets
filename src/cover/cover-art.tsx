import windowArt from "./assets/cover-window.webp";
import "./cover-art.css";

export function CoverArt(props: { closed: number }) {
  return (
    <div class="cover-art">
      <img src={windowArt} alt="" />
      <div class="cover-glass">
        <div
          class="cover-shade"
          style={{ height: `${Math.min(100, Math.max(0, props.closed))}%` }}
        />
      </div>
    </div>
  );
}
