import { CutDirection } from "../replay-insights";

const TRAVEL_ROTATION: Record<Exclude<CutDirection, "dot">, number> = {
  up: 180,
  upRight: 225,
  right: 270,
  downRight: 315,
  down: 0,
  downLeft: 45,
  left: 90,
  upLeft: 135,
};

const LOOP = "2s";
const HIT = 0.3;
const SPLIT = 3.5;

function Cube({ arrowRotation }: { arrowRotation?: number }) {
  return (
    <g transform="translate(-1 0)">
      <rect x="-4" y="-3" width="8" height="8" fill="var(--danger)" />
      <polygon points="-4,-3 -2,-5 6,-5 4,-3" fill="var(--danger)" />
      <polygon points="-4,-3 -2,-5 6,-5 4,-3" fill="#fff" opacity="0.45" />
      <polygon points="4,-3 6,-5 6,3 4,5" fill="var(--danger)" />
      <polygon points="4,-3 6,-5 6,3 4,5" fill="#000" opacity="0.4" />
      <rect x="-4" y="-3" width="8" height="1" fill="#fff" opacity="0.35" />

      <g transform="translate(0 1)">
        {arrowRotation === undefined ? (
          <circle cx="0" cy="0" r="1.6" fill="#fff" />
        ) : (
          <polygon
            transform={`rotate(${arrowRotation})`}
            points="-1,-2.8 1,-2.8 1,0 2.6,0 0,2.8 -2.6,0 -1,0"
            fill="#fff"
          />
        )}
      </g>
    </g>
  );
}

/**
 * A tiny animated block that gets sliced in half in the given cut direction.
 * Pure SVG (SMIL) so it needs no client JS.
 */
export default function SaberCut({ direction, className }: { direction: CutDirection; className?: string }) {
  const rotation = direction === "dot" ? 0 : TRAVEL_ROTATION[direction];
  const arrowRotation = direction === "dot" ? undefined : rotation;
  const id = `saber-cut-${direction}`;
  const splitTimes = `0;${HIT};${HIT + 0.3};1`;

  return (
    <svg
      viewBox="0 0 16 16"
      className={`overflow-visible ${className ?? "size-10"}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${id}-back`}>
          <rect x="-14" y="-14" width="14" height="28" />
        </clipPath>
        <clipPath id={`${id}-front`}>
          <rect x="0" y="-14" width="14" height="28" />
        </clipPath>
      </defs>

      <ellipse cx="8" cy="14.5" rx="6" ry="1.2" fill="#000" opacity="0.3" />

      <g transform={`translate(8 8) rotate(${rotation})`}>
        {(direction === "dot" ? [] : (["back", "front"] as const)).map(half => (
          <g key={half}>
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`0 0; 0 0; ${half === "back" ? -SPLIT : SPLIT} 0; ${half === "back" ? -SPLIT : SPLIT} 0`}
              keyTimes={splitTimes}
              dur={LOOP}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="1;1;0;0"
              keyTimes={splitTimes}
              dur={LOOP}
              repeatCount="indefinite"
            />
            <g clipPath={`url(#${id}-${half})`}>
              <g transform={`rotate(${-rotation})`}>
                <Cube arrowRotation={arrowRotation} />
              </g>
            </g>
          </g>
        ))}

        {direction === "dot" ? (
          <>
            <g>
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1;1;1.25;1;1"
                keyTimes={`0;${HIT};${HIT + 0.05};${HIT + 0.2};1`}
                dur={LOOP}
                repeatCount="indefinite"
              />
              <Cube />
            </g>
            <circle cx="0" cy="0" r="1" fill="#fff">
              <animate
                attributeName="r"
                values="1;1;9;9"
                keyTimes={`0;${HIT};${HIT + 0.2};1`}
                dur={LOOP}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0;0;0.7;0;0"
                keyTimes={`0;${HIT};${HIT + 0.02};${HIT + 0.2};1`}
                dur={LOOP}
                repeatCount="indefinite"
              />
            </circle>
          </>
        ) : (
          <g>
            <animate
              attributeName="opacity"
              values="0;0;1;0;0"
              keyTimes={`0;${HIT - 0.05};${HIT};${HIT + 0.25};1`}
              dur={LOOP}
              repeatCount="indefinite"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 -6; 0 -6; 0 0; 0 4; 0 4"
              keyTimes={`0;${HIT - 0.05};${HIT};${HIT + 0.25};1`}
              dur={LOOP}
              repeatCount="indefinite"
            />
            <rect x="-1.5" y="-11" width="3" height="22" fill="var(--primary)" opacity="0.35" />
            <rect x="-0.5" y="-11" width="1" height="22" fill="#fff" />
          </g>
        )}
      </g>
    </svg>
  );
}
