import { isNativeAndroidPlatform, MesaiUpdater } from '../native/mesaiUpdater';
import { BackupPayload, UserSettings, WorkEntry } from '../types/mesai';
import {
  WORK_TYPE_LABELS,
  calculateHourlyRate,
  formatCurrency,
  formatDuration,
  formatMonthYear,
  summarizeEntries,
} from './calculations';

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function triggerDownload(blob: Blob, filename: string) {
  if (isNativeAndroidPlatform()) {
    void blobToBase64(blob)
      .then((base64Data) =>
        MesaiUpdater.exportFile({
          filename,
          mimeType: blob.type || 'application/octet-stream',
          base64Data,
        })
      )
      .catch(() => {
        // Ignore user-cancelled share sheets
      });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportEntriesToCSV(entries: WorkEntry[], settings: UserSettings) {
  const headers = [
    'Tarih',
    'Başlangıç',
    'Bitiş',
    'Mola (dk)',
    'Çalışma Türü',
    'Net Süre (dk)',
    'Fazla Mesai (dk)',
    'Tahmini Ek Kazanç',
    'Para Birimi',
    'Durum',
    'Açıklama',
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => [
      e.date,
      e.startTime,
      e.endTime,
      e.breakMinutes,
      WORK_TYPE_LABELS[e.workType],
      e.calculatedDurationMinutes,
      e.overtimeDurationMinutes,
      e.estimatedEarnings.toFixed(2),
      settings.currency,
      e.isPlanned ? 'Planlı' : 'Gerçekleşti',
      e.notes,
    ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `mesai-kayitlar-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportJSONBackup(settings: UserSettings, entries: WorkEntry[]) {
  const payload: BackupPayload = {
    app: 'MESAI',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    settings,
    entries,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  triggerDownload(blob, `mesai-yedek-${new Date().toISOString().slice(0, 10)}.json`);
}

export function parseAndValidateBackup(jsonText: string): {
  settings: UserSettings;
  entries: WorkEntry[];
} {
  const parsed = JSON.parse(jsonText) as Partial<BackupPayload>;
  if (!parsed || parsed.app !== 'MESAI' || !parsed.settings || !Array.isArray(parsed.entries)) {
    throw new Error('Geçersiz yedek dosyası biçimi.');
  }

  const s = parsed.settings;
  if (typeof s.monthlySalary !== 'number' || typeof s.dailyWorkHours !== 'number') {
    throw new Error('Yedek dosyasındaki kullanıcı ayarları eksik veya bozuk.');
  }

  const validEntries: WorkEntry[] = parsed.entries.filter(
    (e): e is WorkEntry =>
      Boolean(e && typeof e.id === 'string' && typeof e.date === 'string' && typeof e.startTime === 'string')
  );

  return {
    settings: { ...s, onboardingCompleted: true },
    entries: validEntries,
  };
}

/**
 * Generates a real downloadable A4 PDF file (PDF 1.4 spec) containing a crisp 2x rendered
 * Turkish-character-safe financial & overtime report using Canvas -> JPEG -> PDF wrapper.
 */
export function exportMonthlyPDFReport(
  entries: WorkEntry[],
  settings: UserSettings,
  year: number,
  monthZeroIndexed: number
) {
  const monthPrefix = `${year}-${String(monthZeroIndexed + 1).padStart(2, '0')}`;
  const monthEntries = entries
    .filter((e) => e.date.startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date));

  const summary = summarizeEntries(monthEntries);
  const hourlyRate = calculateHourlyRate(settings);
  const estimatedTotal = settings.monthlySalary + summary.totalExtraEarnings;
  const periodTitle = formatMonthYear(year, monthZeroIndexed);

  // A4 aspect ratio at high clarity (1240 x 1754)
  const width = 1240;
  const height = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Header bar
  ctx.fillStyle = '#101211';
  ctx.fillRect(0, 0, width, 180);

  ctx.fillStyle = '#39D98A';
  ctx.font = 'bold 42px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('MESAİ', 72, 82);

  ctx.fillStyle = '#929B95';
  ctx.font = '22px "DM Sans", sans-serif';
  ctx.fillText('Zamanını takip et, emeğinin karşılığını gör.', 72, 122);

  ctx.fillStyle = '#F4F7F5';
  ctx.textAlign = 'right';
  ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${periodTitle} Raporu`, width - 72, 82);
  ctx.fillStyle = '#929B95';
  ctx.font = '20px "DM Sans", sans-serif';
  ctx.fillText(settings.userName ? `Hazırlanan: ${settings.userName}` : 'Kişisel Kazanç Özeti', width - 72, 120);
  ctx.textAlign = 'left';

  // Summary cards strip
  const cardY = 230;
  const cards = [
    {
      label: 'Tahmini Toplam Kazanç',
      value: formatCurrency(estimatedTotal, settings.currency),
      sub: `Sabit: ${formatCurrency(settings.monthlySalary, settings.currency)}`,
    },
    {
      label: 'Ek Mesai & Tatil Kazancı',
      value: formatCurrency(summary.totalExtraEarnings, settings.currency),
      sub: `Saatlik: ${formatCurrency(hourlyRate, settings.currency, 2)}`,
    },
    {
      label: 'Toplam Çalışma / Fazla Mesai',
      value: formatDuration(summary.totalMinutes),
      sub: `Fazla mesai: ${formatDuration(summary.overtimeMinutes)}`,
    },
  ];

  const cardW = (width - 144 - 48) / 3;
  cards.forEach((c, i) => {
    const x = 72 + i * (cardW + 24);
    ctx.fillStyle = '#F6F8F6';
    ctx.strokeStyle = '#DCE3DE';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, cardY, cardW, 148, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#77827B';
    ctx.font = '600 18px "DM Sans", sans-serif';
    ctx.fillText(c.label, x + 24, cardY + 40);

    ctx.fillStyle = '#17221B';
    ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(c.value, x + 24, cardY + 86);

    ctx.fillStyle = '#159B61';
    ctx.font = '500 17px "DM Sans", sans-serif';
    ctx.fillText(c.sub, x + 24, cardY + 120);
  });

  // Table header
  let y = 435;
  ctx.fillStyle = '#17221B';
  ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Mesai Kayıtları', 72, y);

  y += 28;
  ctx.fillStyle = '#EEF2EF';
  ctx.fillRect(72, y, width - 144, 48);

  ctx.fillStyle = '#17221B';
  ctx.font = 'bold 17px "DM Sans", sans-serif';
  ctx.fillText('Tarih', 90, y + 30);
  ctx.fillText('Saat', 250, y + 30);
  ctx.fillText('Tür', 420, y + 30);
  ctx.fillText('Net Süre', 640, y + 30);
  ctx.fillText('Fazla Mesai', 800, y + 30);
  ctx.textAlign = 'right';
  ctx.fillText('Ek Kazanç', width - 90, y + 30);
  ctx.textAlign = 'left';

  y += 48;

  const maxRows = 22;
  const visibleEntries = monthEntries.slice(0, maxRows);

  if (visibleEntries.length === 0) {
    ctx.fillStyle = '#77827B';
    ctx.font = '20px "DM Sans", sans-serif';
    ctx.fillText('Bu dönem için henüz mesai kaydı bulunmuyor.', 90, y + 54);
  } else {
    visibleEntries.forEach((e, idx) => {
      const rowY = y + idx * 48;
      if (idx % 2 === 1) {
        ctx.fillStyle = '#FAFBF9';
        ctx.fillRect(72, rowY, width - 144, 48);
      }
      ctx.strokeStyle = '#EAEFEE';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(72, rowY + 48);
      ctx.lineTo(width - 72, rowY + 48);
      ctx.stroke();

      ctx.fillStyle = '#17221B';
      ctx.font = '18px "JetBrains Mono", monospace';
      ctx.fillText(e.date, 90, rowY + 30);
      ctx.fillText(`${e.startTime}-${e.endTime}`, 250, rowY + 30);

      ctx.font = '18px "DM Sans", sans-serif';
      ctx.fillText(WORK_TYPE_LABELS[e.workType], 420, rowY + 30);
      ctx.fillText(formatDuration(e.calculatedDurationMinutes), 640, rowY + 30);
      ctx.fillText(e.overtimeDurationMinutes > 0 ? formatDuration(e.overtimeDurationMinutes) : '—', 800, rowY + 30);

      ctx.textAlign = 'right';
      ctx.fillStyle = e.isPlanned ? '#77827B' : '#159B61';
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillText(
        e.isPlanned ? 'Planlı' : formatCurrency(e.estimatedEarnings, settings.currency),
        width - 90,
        rowY + 30
      );
      ctx.textAlign = 'left';
    });
  }

  // Footer note
  ctx.fillStyle = '#77827B';
  ctx.font = '16px "DM Sans", sans-serif';
  const note =
    settings.salaryType === 'gross'
      ? 'Not: Hesaplamalar brüt maaş bazlı tahmini değerlerdir; vergi ve SGK kesintileri dahil değildir.'
      : 'MESAİ kişisel takip raporu · Veriler yalnızca cihazınızda saklanır.';
  ctx.fillText(note, 72, height - 64);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const base64 = dataUrl.split(',')[1];
  const binaryStr = atob(base64);
  const imgBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    imgBytes[i] = binaryStr.charCodeAt(i);
  }

  const pdfBlob = wrapJpegInPdf(imgBytes, width, height);
  triggerDownload(pdfBlob, `mesai-rapor-${monthPrefix}.pdf`);
}

function wrapJpegInPdf(jpegBytes: Uint8Array, imgW: number, imgH: number): Blob {
  // A4 points: 595.28 x 841.89
  const pageW = 595.28;
  const pageH = 841.89;
  const enc = new TextEncoder();

  const parts: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteLen = 0;

  const pushStr = (s: string) => {
    const b = enc.encode(s);
    parts.push(b);
    byteLen += b.length;
  };
  const pushBytes = (b: Uint8Array) => {
    parts.push(b);
    byteLen += b.length;
  };

  pushStr('%PDF-1.4\n');

  // 1: Catalog
  offsets.push(byteLen);
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  offsets.push(byteLen);
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // 3: Page
  offsets.push(byteLen);
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  // 4: Image XObject
  offsets.push(byteLen);
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushStr('\nendstream\nendobj\n');

  // 5: Content stream
  const contentStream = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
  offsets.push(byteLen);
  pushStr(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

  const xrefOffset = byteLen;
  pushStr(`xref\n0 ${offsets.length}\n`);
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i < offsets.length; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const blobParts: BlobPart[] = parts.map((u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer);
  return new Blob(blobParts, { type: 'application/pdf' });
}
