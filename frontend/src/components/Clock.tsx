import { useState, useEffect } from "react";
import { formatTime } from "../utils/dateUtils";
import "./Clock.css";

export default function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="clock-container">
      <div className="clock-time">{formatTime(time)}</div>
    </div>
  );
}
