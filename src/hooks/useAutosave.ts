"use client";

import { useEffect, useRef, useState } from "react";

// useAutosave — 自动保存 hook
// 使用方式：const { status } = useAutosave({ content, date })
// status: "idle" | "saving" | "saved" | "error"

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
  content: string;   // 要保存的内容
  date: string;      // 草稿的日期 key（如 "2026-05-26"）
  delay?: number;    // 防抖延迟，默认 3000ms（3 秒）
}

export function useAutosave({ content, date, delay = 3000 }: UseAutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("idle");

  // useRef 保存 timer ID，避免每次渲染重新创建
  // 这是 React 里处理定时器的标准做法
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 保存函数
  const save = async (text: string) => {
    setStatus("saving");
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, content: text }),
      });
      if (!res.ok) throw new Error("保存失败");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  // content 变化时，重置 3 秒倒计时（防抖）
  // 用户每次击键都会重置，停止输入 3 秒后才真正保存
  // 这是"debounce（防抖）"模式，行业里非常常用
  useEffect(() => {
    if (content === "") {
      setStatus("idle");
      return;
    }

    // 清掉上一个还没触发的定时器
    if (timerRef.current) clearTimeout(timerRef.current);

    setStatus("idle"); // 重置为 idle，等待下一次保存

    timerRef.current = setTimeout(() => {
      save(content);
    }, delay);

    // cleanup：组件卸载时清掉定时器，防止内存泄漏
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, date, delay]);

  // 失焦时立即保存（不等 3 秒）
  const saveNow = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (content) save(content);
  };

  return { status, saveNow };
}
