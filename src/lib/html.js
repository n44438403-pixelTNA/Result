export function generateHTML(htmlContent, title) {
  const html = [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    "<meta charset='utf-8'>",
    `<title>${title}</title>`,
    "<style>",
    "body { font-family: sans-serif; padding: 20px; background: white; color: black; }",
    "table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }",
    "th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }",
    "th { background-color: #e5e7eb; font-weight: bold; text-align: center; }",
    ".text-right { text-align: right; }",
    ".text-center { text-align: center; }",
    ".font-bold { font-weight: bold; }",
    ".font-medium { font-weight: 500; }",
    ".font-semibold { font-weight: 600; }",
    ".font-black { font-weight: 900; }",
    ".bg-gray-50 { background-color: #f9fafb; }",
    ".bg-gray-100 { background-color: #f3f4f6; }",
    ".bg-blue-50 { background-color: #eff6ff; }",
    ".bg-indigo-50 { background-color: #eef2ff; }",
    ".bg-purple-50 { background-color: #faf5ff; }",
    ".bg-green-50 { background-color: #f0fdf4; }",
    ".bg-red-50 { background-color: #fef2f2; }",
    ".bg-yellow-50 { background-color: #fefce8; }",
    ".bg-orange-50 { background-color: #fff7ed; }",
    ".text-blue-600 { color: #2563eb; }",
    ".text-blue-700 { color: #1d4ed8; }",
    ".text-blue-800 { color: #1e40af; }",
    ".text-indigo-600 { color: #4f46e5; }",
    ".text-indigo-700 { color: #4338ca; }",
    ".text-purple-700 { color: #7e22ce; }",
    ".text-purple-800 { color: #6b21a8; }",
    ".text-green-600 { color: #16a34a; }",
    ".text-red-500 { color: #ef4444; }",
    ".text-red-600 { color: #dc2626; }",
    ".text-yellow-600 { color: #ca8a04; }",
    ".text-gray-400 { color: #9ca3af; }",
    ".text-gray-500 { color: #6b7280; }",
    ".text-gray-600 { color: #4b5563; }",
    ".text-gray-700 { color: #374151; }",
    ".text-gray-800 { color: #1f2937; }",
    "h1 { font-size: 24px; font-weight: bold; margin-bottom: 10px; }",
    "p { margin: 5px 0; }",
    "</style>",
    "</head>",
    "<body>",
    htmlContent,
    "</body>",
    "</html>"
  ].join("\n");

  return html;
}

export function downloadHTML(html, filename) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
