import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

export const PAGE_W = 595.28; // A4 width in points
export const PAGE_H = 841.89; // A4 height in points
export const MARGIN = 40;
export const CONTENT_W = PAGE_W - MARGIN * 2;

export interface PDFCtx {
  doc: PDFDocument;
  font: PDFFont;
  boldFont: PDFFont;
  page: PDFPage;
  y: number;
}

export async function createPDFCtx(): Promise<PDFCtx> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_W, PAGE_H]);
  return { doc, font, boldFont, page, y: PAGE_H - MARGIN };
}

export function addPage(ctx: PDFCtx): void {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
}

export function drawText(
  ctx: PDFCtx,
  text: string,
  opts?: { size?: number; bold?: boolean; x?: number; color?: [number, number, number] }
): void {
  const size = opts?.size ?? 10;
  const font = opts?.bold ? ctx.boldFont : ctx.font;
  const x = opts?.x ?? MARGIN;
  const color = opts?.color ?? [0, 0, 0];

  // Wrap if needed: simple line break at content width
  const maxWidth = CONTENT_W - (x - MARGIN);
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  for (const l of lines) {
    if (ctx.y < MARGIN + 20) addPage(ctx);
    ctx.page.drawText(l, {
      x,
      y: ctx.y,
      size,
      font,
      color: rgb(color[0], color[1], color[2]),
    });
    ctx.y -= size + 4;
  }
}

export function drawBox(
  ctx: PDFCtx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: [number, number, number] = [0.93, 0.93, 0.93]
): void {
  ctx.page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: rgb(color[0], color[1], color[2]),
  });
}

export interface ChartSeries {
  label: string;
  data: number[];
  color: [number, number, number];
  dashed?: boolean;
}

/**
 * Draws a simple line chart on the PDF page.
 * Returns the y position after the chart.
 */
export function drawLineChart(
  ctx: PDFCtx,
  title: string,
  labels: string[],
  series: ChartSeries[],
  opts?: { chartW?: number; chartH?: number }
): void {
  const chartW = opts?.chartW ?? CONTENT_W;
  const chartH = opts?.chartH ?? 120;

  if (ctx.y < chartH + 60) addPage(ctx);

  // Title
  drawText(ctx, title, { size: 11, bold: true });
  ctx.y -= 4;

  const baseY = ctx.y - chartH;
  const baseX = MARGIN + 30;
  const plotW = chartW - 60;

  // Background
  drawBox(ctx, baseX, baseY, plotW, chartH, [0.97, 0.97, 0.97]);

  // Find min/max
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const s of series) {
    for (const v of s.data) {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
  }
  if (minVal === maxVal) {
    maxVal = minVal + 1;
  }
  const range = maxVal - minVal;

  // Draw series
  for (const s of series) {
    if (s.data.length < 2) continue;
    const step = plotW / (s.data.length - 1);
    for (let i = 0; i < s.data.length - 1; i++) {
      const x1 = baseX + i * step;
      const y1 = baseY + ((s.data[i] - minVal) / range) * chartH;
      const x2 = baseX + (i + 1) * step;
      const y2 = baseY + ((s.data[i + 1] - minVal) / range) * chartH;

      ctx.page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: s.dashed ? 1 : 1.5,
        color: rgb(s.color[0], s.color[1], s.color[2]),
        dashArray: s.dashed ? [4, 3] : undefined,
      });
    }
  }

  // X-axis labels
  if (labels.length > 0) {
    const step = plotW / (labels.length - 1 || 1);
    const maxLabels = Math.min(labels.length, 8);
    const labelStep = Math.max(1, Math.floor(labels.length / maxLabels));
    for (let i = 0; i < labels.length; i += labelStep) {
      ctx.page.drawText(labels[i], {
        x: baseX + i * step - 10,
        y: baseY - 12,
        size: 7,
        font: ctx.font,
      });
    }
  }

  // Legend
  let legendX = baseX;
  for (const s of series) {
    ctx.page.drawLine({
      start: { x: legendX, y: baseY - 24 },
      end: { x: legendX + 15, y: baseY - 24 },
      thickness: 2,
      color: rgb(s.color[0], s.color[1], s.color[2]),
      dashArray: s.dashed ? [4, 3] : undefined,
    });
    ctx.page.drawText(s.label, {
      x: legendX + 18,
      y: baseY - 27,
      size: 7,
      font: ctx.font,
    });
    legendX += ctx.font.widthOfTextAtSize(s.label, 7) + 30;
  }

  ctx.y = baseY - 36;
}

/** Convenience: draw multi-line chart is same as drawLineChart with multiple series */
export const drawMultiLineChart = drawLineChart;
