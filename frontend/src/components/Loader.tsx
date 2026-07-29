import "./Loader.css";

interface LoaderProps {
  fullScreen?: boolean;
}

export default function Loader({ fullScreen = true }: LoaderProps) {
  return (
    <div className={fullScreen ? "autotrade-loader-overlay" : "autotrade-loader-inline"}>
      <div className="autotrade-loader-container">
        {/* Animated outer ring spinner */}
        <div className="autotrade-loader-ring" />

        {/* Brand logo image */}
        <img
          src="/img/logo.png"
          alt="AutoTrade Loading..."
          className="autotrade-loader-logo"
        />
      </div>
      <p className="autotrade-loader-text">Loading AutoTrade...</p>
    </div>
  );
}
