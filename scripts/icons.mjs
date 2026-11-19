import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("public/icons", { recursive: true });
const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="96" fill="#167451"/><path d="M120 148h56l80 176 80-176h56L277 384h-42z" fill="white"/><path d="M121 113h270v14H121z" fill="#b2d8c7"/></svg>`;
for (const size of [192, 512])
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
await sharp(Buffer.from(svg.replace('rx="96"', 'rx="0"')))
  .png()
  .toFile("public/icons/maskable-512.png");
