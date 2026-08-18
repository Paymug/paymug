"use client";

import { useEffect, useRef } from "react";
import type EditorJS from "@editorjs/editorjs";
import {
  uploadProductDescriptionImage,
  uploadProductDescriptionImageByUrl,
} from "./product-form.utils";
import { parseProductDescription } from "./product-description.utils";
import type { ProductDescriptionEditorProps } from "./product-description.types";

export function ProductDescriptionEditor({
  value,
  onChange,
}: ProductDescriptionEditorProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;

    async function createEditor() {
      const [
        { default: Editor },
        { default: Header },
        { default: List },
        { default: Image },
        { default: Underline },
      ] = await Promise.all([
        import("@editorjs/editorjs"),
        import("@editorjs/header"),
        import("@editorjs/list"),
        import("@editorjs/image"),
        import("@editorjs/underline"),
      ]);
      if (cancelled || !holderRef.current) return;

      const editor = new Editor({
        holder: holderRef.current,
        data: parseProductDescription(value),
        minHeight: 220,
        placeholder: "Describe what buyers will receive…",
        inlineToolbar: ["bold", "italic", "underline"],
        tools: {
          header: {
            class: Header,
            inlineToolbar: ["bold", "italic", "underline"],
            config: { levels: [2, 3, 4, 5], defaultLevel: 2 },
          },
          list: {
            class: List,
            inlineToolbar: ["bold", "italic", "underline"],
          },
          image: {
            class: Image,
            config: {
              uploader: {
                uploadByFile: uploadProductDescriptionImage,
                uploadByUrl: uploadProductDescriptionImageByUrl,
              },
            },
          },
          underline: Underline,
        },
        async onChange(api) {
          const output = await api.saver.save();
          onChangeRef.current(JSON.stringify(output));
        },
      });
      editorRef.current = editor;
    }

    void createEditor();
    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, []);

  return (
    <div
      ref={holderRef}
      className="mt-5 min-h-64 py-2 text-sm [&_.ce-block__content]:max-w-none [&_.ce-toolbar__content]:max-w-none [&_.codex-editor__redactor]:pb-8! [&_h2.ce-header]:text-xl [&_h2.ce-header]:font-semibold [&_h3.ce-header]:text-lg [&_h3.ce-header]:font-semibold [&_h4.ce-header]:text-base [&_h4.ce-header]:font-semibold [&_h5.ce-header]:text-sm [&_h5.ce-header]:font-semibold"
    />
  );
}
