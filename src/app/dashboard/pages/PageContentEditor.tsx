"use client";

import type EditorJS from "@editorjs/editorjs";
import { useEffect, useRef } from "react";
import {
  uploadProductDescriptionImage,
  uploadProductDescriptionImageByUrl,
} from "@/components/product-form.utils";
import { parseProductDescription } from "@/components/product-description.utils";
import type { PageContentEditorProps } from "./PageEditor.types";

export function PageContentEditor({
  value,
  onChange,
}: PageContentEditorProps) {
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
        minHeight: 360,
        placeholder: "Tell your story…",
        inlineToolbar: ["bold", "italic", "underline"],
        tools: {
          header: {
            class: Header,
            inlineToolbar: ["bold", "italic", "underline"],
            config: { levels: [2, 3, 4], defaultLevel: 2 },
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
          onChangeRef.current(JSON.stringify(await api.saver.save()));
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
      className="min-h-96 text-[1.08rem] leading-8 text-foreground [&_.ce-block__content]:max-w-[42rem] [&_.ce-toolbar__content]:max-w-[46rem] [&_.codex-editor__redactor]:pb-20! [&_h2.ce-header]:mt-10 [&_h2.ce-header]:text-3xl [&_h2.ce-header]:font-semibold [&_h3.ce-header]:mt-8 [&_h3.ce-header]:text-2xl [&_h3.ce-header]:font-semibold [&_h4.ce-header]:text-base [&_h4.ce-header]:font-semibold [&_.image-tool]:my-8 [&_.image-tool__caption]:text-muted"
    />
  );
}
