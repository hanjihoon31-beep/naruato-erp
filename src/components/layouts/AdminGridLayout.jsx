import React from "react";

export default function AdminGridLayout({ children }) {
  return <div className="grid w-full grid-cols-1 gap-6 p-6 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
