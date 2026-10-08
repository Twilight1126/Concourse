export default function UpdatedAt({ value }) {
  return <span className="data-updated-at" role="status">
    {value ? <>Updated <time dateTime={value.toISOString()}>{value.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></> : "Loading data…"}
  </span>;
}
