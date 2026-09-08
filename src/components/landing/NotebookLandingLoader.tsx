"use client";

import dynamic from "next/dynamic";
import type { NotebookSubjectData } from "./types";

// next/dynamic with ssr:false must be called from a Client Component.
const NotebookLanding = dynamic(() => import("./NotebookLanding"), {
  ssr: false,
  loading: () => <div className="notebook-landing notebook-landing-loading" />,
});

export default function NotebookLandingLoader({ subjects }: { subjects: NotebookSubjectData[] }) {
  return <NotebookLanding subjects={subjects} />;
}
