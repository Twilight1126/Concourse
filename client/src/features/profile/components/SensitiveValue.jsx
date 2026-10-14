import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useState } from "react";
import "./SensitiveValue.css";

function SensitiveValue({ label, value }) {
  const [isVisible, setIsVisible] = useState(false);

  if (!value) return "Not added";

  return (
    <span className="sensitive-value">
      <span>{isVisible ? value : "••••••••"}</span>
      <button
        type="button"
        className="sensitive-value__toggle"
        aria-label={`${isVisible ? "Hide" : "Show"} ${label.toLowerCase()}`}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((visible) => !visible)}
      >
        {isVisible ? <EyeSlash size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </span>
  );
}

export default SensitiveValue;
