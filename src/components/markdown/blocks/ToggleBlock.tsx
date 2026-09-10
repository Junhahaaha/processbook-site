import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ZoomableImage from "../ZoomableImage";

// Collapsible "toggle" note: first line of the fence is the always-visible
// summary, everything after it is the body shown when expanded. The body is
// ordinary markdown (paragraphs, lists, links, images) — it can't contain
// other custom fenced blocks, since markdown doesn't nest ``` fences.
export default function ToggleBlock({ title, body }: { title: string; body: string }) {
  return (
    <details className="toggle-block">
      <summary className="toggle-block-summary">
        <span className="toggle-block-chevron" aria-hidden>
          ▶
        </span>
        <span>{title || "펼쳐보기"}</span>
      </summary>
      {body.trim().length > 0 && (
        <div className="toggle-block-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({ children }) => <>{children}</>,
              img: (props) => <ZoomableImage {...props} />,
            }}
          >
            {body}
          </ReactMarkdown>
        </div>
      )}
    </details>
  );
}
