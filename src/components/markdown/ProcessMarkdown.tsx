import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LinkMeta } from "@/lib/link-meta.server";
import { colorForIndex } from "@/lib/colors";
import ZoomableImage from "./ZoomableImage";
import BeforeAfter from "./blocks/BeforeAfter";
import Gallery from "./blocks/Gallery";
import CursorSwitch from "./blocks/CursorSwitch";
import VideoBlock from "./blocks/VideoBlock";
import AudioBlock from "./blocks/AudioBlock";
import Sticker from "./blocks/Sticker";
import PdfBlock from "./blocks/PdfBlock";
import ColorChip from "./blocks/ColorChip";
import LinkCard from "./blocks/LinkCard";
import FeedbackCard from "./blocks/FeedbackCard";
import ToggleBlock from "./blocks/ToggleBlock";

export default function ProcessMarkdown({
  source,
  feedbackColors,
  linkMeta,
}: {
  source: string;
  feedbackColors: Record<string, string>;
  linkMeta: Record<string, LinkMeta>;
}) {
  const components: Components = {
    pre: ({ children }) => <>{children}</>,
    img: (props) => <ZoomableImage {...props} />,
    code(props) {
      const { className, children } = props;
      const raw = String(children ?? "").replace(/\n$/, "");
      const match = /language-([\w-]+)/.exec(className ?? "");
      const lang = match?.[1];

      if (!lang) return <code className="inline-code">{children}</code>;

      const lines = raw.split("\n").filter((l) => l.trim().length > 0);

      switch (lang) {
        case "before-after":
          return <BeforeAfter lines={lines} />;
        case "gallery":
          return <Gallery lines={lines} />;
        case "cursor-switch":
          return <CursorSwitch lines={lines} />;
        case "video":
          return <VideoBlock src={raw.trim()} />;
        case "audio":
          return <AudioBlock src={raw.trim()} />;
        case "sticker":
          return <Sticker lines={lines} />;
        case "pdf":
          return <PdfBlock src={raw.trim()} />;
        case "color-chip":
          return <ColorChip lines={lines} />;
        case "link-card":
          return <LinkCard urls={lines} metaMap={linkMeta} />;
        case "feedback": {
          const text = raw.trim();
          const color = feedbackColors[text] ?? colorForIndex(0);
          return <FeedbackCard color={color} content={text} />;
        }
        case "toggle": {
          const nl = raw.indexOf("\n");
          const title = (nl === -1 ? raw : raw.slice(0, nl)).trim();
          const body = nl === -1 ? "" : raw.slice(nl + 1).replace(/^\n+/, "");
          return <ToggleBlock title={title} body={body} />;
        }
        default:
          return (
            <pre className="code-block">
              <code className={className}>{children}</code>
            </pre>
          );
      }
    },
  };

  return (
    <div className="prose-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
