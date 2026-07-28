import "./Loader.css";

interface LoaderProps {
  fullScreen?: boolean;
}

export default function Loader({ fullScreen = true }: LoaderProps) {
  return (
    <div className={fullScreen ? "vastra-loader-overlay" : "vastra-loader-inline"}>
      <svg
        width="90"
        height="90"
        viewBox="0 0 100 100"
        className="vastra-loader-svg"
      >
        <defs>
          <clipPath id="vastra-vclip">
            <polygon points="10,15 50,85 90,15 78,15 50,63 22,15" />
          </clipPath>
          <linearGradient id="vastra-sweepgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2a12" />
            <stop offset="45%" stopColor="#c9922f" />
            <stop offset="55%" stopColor="#f0c777" />
            <stop offset="65%" stopColor="#c9922f" />
            <stop offset="100%" stopColor="#3a2a12" />
          </linearGradient>
        </defs>
        <polygon
          points="10,15 50,85 90,15 78,15 50,63 22,15"
          fill="#3a2a12"
        />
        <g clipPath="url(#vastra-vclip)">
          <rect
            x="0"
            y="0"
            width="100"
            height="60"
            fill="url(#vastra-sweepgrad)"
            className="vastra-sweep-rect"
          />
        </g>
      </svg>
    </div>
  );
}
