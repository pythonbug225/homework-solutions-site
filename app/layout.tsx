import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "数学课程资源 · 开放题解与 XeLaTeX 工作台",
  description: "按学科与课程阅读数学题解、讲义和试卷。搜索 288 份资源，协作上传并在线使用 XeLaTeX 编译。",
  icons: {
    icon: "/math-icon.svg",
    shortcut: "/math-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
