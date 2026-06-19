import { useMemo, useRef, useState } from 'react';

const COLORS = ['#f8fafc', '#e2e8f0', '#cbd5e1', '#a5b4fc', '#bae6fd', '#fde68a', '#fbcfe8', '#fcd34d'];

function getSegmentColors(count: number) {
  const segmentColors: string[] = [];
  let previousColor = '';

  for (let i = 0; i < count; i += 1) {
    let color = COLORS[i % COLORS.length];

    if (color === previousColor) {
      color = COLORS[(i + 1) % COLORS.length];
    }

    if (i === count - 1 && count > 1 && color === segmentColors[0]) {
      const alternative = COLORS[(COLORS.indexOf(color) + 1) % COLORS.length];
      if (alternative !== previousColor && alternative !== segmentColors[0]) {
        color = alternative;
      }
    }

    segmentColors.push(color);
    previousColor = color;
  }

  return segmentColors;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function calculateSpin(
  numberOfNames: number,
  winnerIndex: number,
  duration = 10,
  extraSpins = 8
) {
  const anglePerSlice = 360 / numberOfNames;

  const targetAngle =
    360 -
    (winnerIndex * anglePerSlice + anglePerSlice / 2);

  const totalRotation = extraSpins * 360 + targetAngle;

  const initialSpeed = (2 * totalRotation) / duration;

  const deceleration = -initialSpeed / duration;

  return {
    anglePerSlice,
    targetAngle,
    totalRotation,
    initialSpeed,
    deceleration,
  };
}

function App() {
  const [names, setNames] = useState<string[]>([
    'Ali',
    'Beatriz',
    'Charles',
    'Diya',
    'Eric',
    'Fatima',
    'Gabriel',
    'Hanna',
  ]);
  const [candidate, setCandidate] = useState('');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const targetIndexRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const startRotationRef = useRef<number>(0);
  const targetRotationRef = useRef<number>(0);
  const initialSpeedRef = useRef<number>(0);
  const decelerationRef = useRef<number>(0);

  const segmentAngle = useMemo(() => (names.length > 0 ? 360 / names.length : 360), [names.length]);

  const segments = useMemo(() => {
    const segmentColors = getSegmentColors(names.length);

    return names.map((name, index) => {
      const startAngle = segmentAngle * index;
      const endAngle = startAngle + segmentAngle;
      return {
        name,
        path: describeArc(260, 260, 250, startAngle, endAngle),
        fill: segmentColors[index],
        textAngle: startAngle + segmentAngle / 2,
      };
    });
  }, [names, segmentAngle]);

  const addName = () => {
    const value = candidate.trim();
    if (!value) return;

    setNames((prev) => [...prev, value]);
    setCandidate('');
    setSelected(null);
    setSelectedIndex(null);
    setResultVisible(false);
  };

  const removeName = (index: number) => {
    setNames((prev) => prev.filter((_, idx) => idx !== index));
    setSelected(null);
    setSelectedIndex(null);
    setResultVisible(false);
  };

  const closeResult = () => {
    setResultVisible(false);
  };

  const removeSelected = () => {
    if (selectedIndex === null) return;
    removeName(selectedIndex);
    setSelected(null);
    setSelectedIndex(null);
    setResultVisible(false);
  };

  const resolveSelectedIndex = (rotationDegrees: number) => {
    const normalized = ((90 - rotationDegrees) % 360 + 360) % 360;
    return Math.min(names.length - 1, Math.floor(normalized / segmentAngle));
  };

  const activeIndex = names.length > 0 ? resolveSelectedIndex(rotation) : null;

  const finishSpin = () => {
    setSpinning(false);
    const resolvedIndex = resolveSelectedIndex(targetRotationRef.current);
    const record = names[resolvedIndex];
    setRotation(targetRotationRef.current);
    setSelected(record);
    setSelectedIndex(resolvedIndex);
    setResultVisible(true);
    targetIndexRef.current = null;
    animationStartTimeRef.current = null;
    animationFrameRef.current = null;
  };

  const animateSpin = (timestamp: number) => {
    if (animationStartTimeRef.current === null) {
      animationStartTimeRef.current = timestamp;
    }

    const elapsed = timestamp - animationStartTimeRef.current;
    const totalDuration = 13000;
    const elapsedSeconds = elapsed / 1000;
    const angle =
      initialSpeedRef.current * elapsedSeconds +
      0.5 * decelerationRef.current * elapsedSeconds * elapsedSeconds;
    const currentRotation = startRotationRef.current + angle;

    setRotation(currentRotation);

    if (elapsed < totalDuration) {
      animationFrameRef.current = requestAnimationFrame(animateSpin);
    } else {
      finishSpin();
    }
  };

  const spinWheel = () => {
    if (names.length === 0 || spinning) return;
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const index = Math.floor(Math.random() * names.length);
    targetIndexRef.current = index;
    startRotationRef.current = rotation;

    const totalDuration = 13000;
    const { totalRotation, initialSpeed, deceleration } = calculateSpin(
      names.length,
      index,
      totalDuration / 1000,
      8
    );

    targetRotationRef.current = rotation + totalRotation;
    initialSpeedRef.current = initialSpeed;
    decelerationRef.current = deceleration;

    setSelected(null);
    setSelectedIndex(null);
    setResultVisible(false);
    setSpinning(true);
    animationFrameRef.current = requestAnimationFrame(animateSpin);
  };

  return (
    <div className="app">
      <div className="penguin-body">
        <div className="penguin-head">
          <div className="penguin-eye left" />
          <div className="penguin-eye right" />
          <div className="penguin-beak" />
          <div className="penguin-cheek left" />
          <div className="penguin-cheek right" />
        </div>
        <div className="penguin-belly">
          <div className="wheel-shell">
            <div
              className="pointer"
              style={{ borderRightColor: activeIndex !== null ? segments[activeIndex].fill : '#facc15' }}
            />
            <svg
              className="wheel"
              viewBox="0 0 520 520"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              {segments.map((segment, index) => {
                const textPos = polarToCartesian(260, 260, 165, segment.textAngle);
                const isSelected = activeIndex === index;
                return (
                  <g key={`${segment.name}-${index}`}>
                    <path
                      d={segment.path}
                      fill={segment.fill}
                      stroke={isSelected ? segment.fill : 'none'}
                      strokeWidth={isSelected ? 10 : 0}
                      strokeLinejoin="round"
                      style={isSelected ? { filter: 'drop-shadow(0 0 12px rgba(0, 0, 0, 0.25))' } : undefined}
                    />
                    <text
                      x={textPos.x}
                      y={textPos.y}
                      fill="#0f172a"
                      fontSize="18"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${segment.textAngle + 90} ${textPos.x} ${textPos.y})`}
                    >
                      {segment.name}
                    </text>
                  </g>
                );
              })}
              <circle cx="260" cy="260" r="60" fill="#f8fafc" />
              <text x="260" y="260" fill="#0f172a" textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="700">
                GO
              </text>
            </svg>
          </div>
        </div>
        <div className="penguin-wing left" />
        <div className="penguin-wing right" />
        <div className="penguin-foot left" />
        <div className="penguin-foot right" />
      </div>

      <div className="controls-panel">
        <div className="input-card">
          
          <h2>Chillpinguuu's Wheel of Names</h2>
          <p>Enter names and spin the wheel to pick one.</p>
          <div className="name-form">
            <input
              value={candidate}
              onChange={(event) => setCandidate(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && addName()}
              placeholder="Add a name"
            />
            <button onClick={addName} disabled={!candidate.trim()}>
              Add
            </button>
          </div>
          <div className="names-list">
            {names.length === 0 ? (
              <div className="empty-state">No names yet. Add one to get started.</div>
            ) : (
              names.map((name, index) => (
                <div className="name-row" key={`${name}-${index}`}>
                  <span>{name}</span>
                  <button className="remove-btn" onClick={() => removeName(index)}>
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
          <button className="spin-btn" onClick={spinWheel} disabled={spinning || names.length === 0}>
            {spinning ? 'Spinning…' : 'Spin Wheel'}
          </button>
          {selected && <div className="result-banner">Selected: <strong>{selected}</strong></div>}
        </div>
      </div>

      {selected && resultVisible && (
        <div className="result-overlay">
          <div className="result-modal">
            <div className="result-modal-header">We have a winner!</div>
            <div className="result-modal-body">{selected}</div>
            <div className="result-modal-actions">
              <button className="modal-close-btn" onClick={closeResult}>
                Close
              </button>
              <button className="modal-remove-btn" onClick={removeSelected}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
