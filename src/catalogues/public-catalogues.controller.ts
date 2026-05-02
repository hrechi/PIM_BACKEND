import { Controller, Get, Param, Res, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CataloguesService } from './catalogues.service';

@ApiTags('Public Catalogues')
@Controller('public/catalogues')
export class PublicCataloguesController {
  constructor(private readonly cataloguesService: CataloguesService) {}

  /** JSON endpoint — used by the Flutter app. */
  @Get(':shareToken/data')
  async getPublicCatalogueJson(@Param('shareToken') shareToken: string) {
    return this.cataloguesService.getPublicCatalogueByToken(shareToken);
  }

  /** HTML book view — opened in a browser via the share link. */
  @Get(':shareToken')
  async getPublicCatalogueHtml(
    @Param('shareToken') shareToken: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    if (format === 'json') {
      const data = await this.cataloguesService.getPublicCatalogueByToken(shareToken);
      return res.json(data);
    }

    let catalogue: Awaited<ReturnType<typeof this.cataloguesService.getPublicCatalogueByToken>>;
    try {
      catalogue = await this.cataloguesService.getPublicCatalogueByToken(shareToken);
    } catch {
      return res.status(404).send(this._notFoundHtml());
    }

    return res.setHeader('Content-Type', 'text/html; charset=utf-8').send(this._renderBook(catalogue));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HTML rendering helpers
  // ─────────────────────────────────────────────────────────────────────────

  private _notFoundHtml(): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Catalogue Not Found</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f7f5}
.box{text-align:center;padding:40px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h1{color:#309448;font-size:2rem;margin-bottom:8px}p{color:#666}</style></head>
<body><div class="box"><h1>🌿</h1><h1>Catalogue Not Found</h1>
<p>This link may have expired or been revoked.</p></div></body></html>`;
  }

  private _renderBook(catalogue: any): string {
    const settings = catalogue.settings ?? {};
    const animals: any[] = catalogue.animals ?? [];
    const showPrices = catalogue.showPrices ?? false;
    const currency = catalogue.currency ?? 'TND';

    const formatDate = (iso: string | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const esc = (s: string | null | undefined) =>
      (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const animalCards = animals
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((ca, idx) => {
        const a = ca.animal;
        if (!a) return '';

        const name = esc(a.name || a.tagNumber || `Animal #${idx + 1}`);
        const breed = esc(a.breed);
        const sex = esc(a.sex);
        const ageMonths: number = a.age ?? 0;
        const ageLabel =
          ageMonths >= 12
            ? `${Math.floor(ageMonths / 12)} yr${Math.floor(ageMonths / 12) > 1 ? 's' : ''}`
            : `${ageMonths} mo`;

        const weight = a.weight ? `${a.weight} kg` : null;
        const health = esc(a.healthStatus ?? '');
        const type = esc(a.animalType ?? '');

        // Price
        let priceHtml = '';
        if (showPrices) {
          const raw = ca.priceOverride ?? a.estimatedValue ?? a.salePrice;
          if (raw != null) {
            priceHtml = `<div class="price-tag">${esc(String(raw))} ${esc(currency)}</div>`;
          }
        }

        // Photo
        const serverOrigin = process.env.SERVER_ORIGIN ?? '';
        const photoHtml =
          settings.showPhotos && a.profileImage
            ? `<div class="animal-photo"><img src="${esc(serverOrigin + a.profileImage)}" alt="${name}" loading="lazy"/></div>`
            : `<div class="animal-photo no-photo"><span>${this._animalEmoji(a.animalType)}</span></div>`;

        // Details badges
        const badges: string[] = [];
        if (type) badges.push(`<span class="badge type">${type}</span>`);
        if (sex) badges.push(`<span class="badge sex">${sex}</span>`);
        badges.push(`<span class="badge age">${ageLabel}</span>`);
        if (weight) badges.push(`<span class="badge weight">${weight}</span>`);
        if (settings.showHealth && health) badges.push(`<span class="badge health ${health.toLowerCase()}">${health}</span>`);
        if (a.vaccination) badges.push(`<span class="badge vacc">✓ Vaccinated</span>`);
        if (a.isFattening) badges.push(`<span class="badge fatten">Fattening</span>`);

        // Notes
        const notesHtml =
          settings.showNotes && ca.notes
            ? `<p class="notes">${esc(ca.notes)}</p>`
            : '';

        return `
<div class="animal-card">
  <div class="card-number">${idx + 1}</div>
  ${photoHtml}
  <div class="card-body">
    <h3 class="animal-name">${name}</h3>
    ${breed ? `<p class="breed">${breed}</p>` : ''}
    <div class="badges">${badges.join('')}</div>
    ${notesHtml}
    ${priceHtml}
  </div>
</div>`;
      })
      .join('');

    const expiresAt = catalogue.shareExpiresAt ? formatDate(catalogue.shareExpiresAt) : '';
    const saleDate = catalogue.saleDate ? formatDate(catalogue.saleDate) : '';
    const location = esc(catalogue.location ?? '');
    const title = esc(catalogue.title ?? 'Animal Catalogue');
    const animalCount = animals.length;
    const viewCount = catalogue.shareViewCount ?? 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <meta name="description" content="Animal sale catalogue — ${title}"/>
  <style>
    /* ── Reset & Base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --green: #309448;
      --green-light: #e8f5e9;
      --green-dark: #1b5e20;
      --accent: #f9a825;
      --bg: #f5f7f5;
      --card-bg: #ffffff;
      --text: #1a1a1a;
      --muted: #757575;
      --border: #e0e0e0;
      --radius: 16px;
      --shadow: 0 4px 20px rgba(0,0,0,.08);
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    /* ── Cover ── */
    .cover {
      background: linear-gradient(135deg, var(--green-dark) 0%, var(--green) 60%, #43a047 100%);
      color: #fff;
      padding: 60px 24px 48px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .cover::before {
      content: '';
      position: absolute; inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    .cover-logo { font-size: 56px; margin-bottom: 16px; }
    .cover h1 { font-size: clamp(1.6rem, 5vw, 2.8rem); font-weight: 800; letter-spacing: -.5px; margin-bottom: 12px; }
    .cover-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 20px; }
    .cover-meta-item { display: flex; align-items: center; gap: 6px; font-size: .9rem; opacity: .9; }
    .cover-stats {
      display: flex; justify-content: center; gap: 32px; margin-top: 32px;
      background: rgba(255,255,255,.12); border-radius: 12px; padding: 16px 24px;
      backdrop-filter: blur(4px);
    }
    .stat { text-align: center; }
    .stat-value { font-size: 1.8rem; font-weight: 800; }
    .stat-label { font-size: .75rem; opacity: .8; text-transform: uppercase; letter-spacing: .5px; }

    /* ── Status badge ── */
    .status-badge {
      display: inline-block; padding: 4px 14px; border-radius: 20px;
      font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
      background: rgba(255,255,255,.2); color: #fff; margin-top: 12px;
    }

    /* ── Section header ── */
    .section-header {
      padding: 24px 20px 12px;
      display: flex; align-items: center; gap: 10px;
    }
    .section-header h2 { font-size: 1.1rem; font-weight: 700; color: var(--green-dark); }
    .section-divider { flex: 1; height: 1px; background: var(--border); }

    /* ── Grid ── */
    .animals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      padding: 0 20px 40px;
    }

    /* ── Animal Card ── */
    .animal-card {
      background: var(--card-bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
      position: relative;
      transition: transform .2s, box-shadow .2s;
    }
    .animal-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(0,0,0,.12); }

    .card-number {
      position: absolute; top: 12px; left: 12px; z-index: 2;
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--green); color: #fff;
      font-size: .8rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(48,148,72,.4);
    }

    .animal-photo {
      width: 100%; height: 200px; overflow: hidden;
      background: var(--green-light);
    }
    .animal-photo img { width: 100%; height: 100%; object-fit: cover; }
    .animal-photo.no-photo {
      display: flex; align-items: center; justify-content: center;
      font-size: 64px;
    }

    .card-body { padding: 16px; }
    .animal-name { font-size: 1.1rem; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .breed { font-size: .85rem; color: var(--muted); margin-bottom: 10px; }

    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .badge {
      padding: 3px 10px; border-radius: 20px; font-size: .72rem; font-weight: 600;
      border: 1px solid transparent;
    }
    .badge.type { background: #e3f2fd; color: #1565c0; border-color: #90caf9; }
    .badge.sex { background: #fce4ec; color: #880e4f; border-color: #f48fb1; }
    .badge.age { background: #fff8e1; color: #e65100; border-color: #ffcc80; }
    .badge.weight { background: #f3e5f5; color: #6a1b9a; border-color: #ce93d8; }
    .badge.health.optimal { background: #e8f5e9; color: #2e7d32; border-color: #a5d6a7; }
    .badge.health.good { background: #e8f5e9; color: #388e3c; border-color: #a5d6a7; }
    .badge.health.fair { background: #fff8e1; color: #f57f17; border-color: #ffe082; }
    .badge.health.poor { background: #ffebee; color: #c62828; border-color: #ef9a9a; }
    .badge.vacc { background: #e8f5e9; color: #2e7d32; border-color: #a5d6a7; }
    .badge.fatten { background: #fff3e0; color: #e65100; border-color: #ffcc80; }

    .notes { font-size: .82rem; color: var(--muted); font-style: italic; margin-bottom: 10px; }

    .price-tag {
      display: inline-block;
      background: var(--green); color: #fff;
      padding: 6px 16px; border-radius: 20px;
      font-size: .95rem; font-weight: 700;
      margin-top: 4px;
    }

    /* ── Footer ── */
    .footer {
      background: var(--green-dark); color: rgba(255,255,255,.7);
      text-align: center; padding: 24px 20px;
      font-size: .8rem;
    }
    .footer strong { color: #fff; }
    .footer-meta { margin-top: 8px; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }

    /* ── Empty state ── */
    .empty { text-align: center; padding: 60px 20px; color: var(--muted); }
    .empty-icon { font-size: 64px; margin-bottom: 16px; }

    /* ── Responsive ── */
    @media (max-width: 480px) {
      .animals-grid { grid-template-columns: 1fr; padding: 0 12px 32px; }
      .cover { padding: 40px 16px 32px; }
      .cover-stats { gap: 20px; }
    }

    @media print {
      .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .animal-card { break-inside: avoid; }
    }
  </style>
</head>
<body>

<!-- ── Cover ── -->
<div class="cover">
  <div class="cover-logo">🌿</div>
  <h1>${title}</h1>
  ${location ? `<div class="cover-meta-item">📍 ${location}</div>` : ''}
  ${saleDate ? `<div class="cover-meta"><div class="cover-meta-item">📅 Sale date: <strong>${saleDate}</strong></div></div>` : ''}
  <div class="status-badge">${esc(catalogue.status ?? 'PUBLISHED')}</div>
  <div class="cover-stats">
    <div class="stat">
      <div class="stat-value">${animalCount}</div>
      <div class="stat-label">Animals</div>
    </div>
    ${showPrices ? `<div class="stat"><div class="stat-value">${esc(currency)}</div><div class="stat-label">Currency</div></div>` : ''}
    <div class="stat">
      <div class="stat-value">${viewCount}</div>
      <div class="stat-label">Views</div>
    </div>
  </div>
</div>

<!-- ── Animals ── -->
<div class="section-header">
  <h2>🐾 Animals for Sale</h2>
  <div class="section-divider"></div>
  <span style="font-size:.85rem;color:var(--muted)">${animalCount} listed</span>
</div>

${
  animalCount === 0
    ? `<div class="empty"><div class="empty-icon">🐾</div><p>No animals listed in this catalogue.</p></div>`
    : `<div class="animals-grid">${animalCards}</div>`
}

<!-- ── Footer ── -->
<div class="footer">
  <strong>Fieldly</strong> — Animal Sale Catalogue
  <div class="footer-meta">
    ${expiresAt ? `<span>🔗 Link valid until ${expiresAt}</span>` : ''}
    <span>Generated by Fieldly PIM</span>
  </div>
</div>

</body>
</html>`;
  }

  private _animalEmoji(type: string | null | undefined): string {
    switch ((type ?? '').toLowerCase()) {
      case 'cow': return '🐄';
      case 'sheep': return '🐑';
      case 'horse': return '🐴';
      case 'dog': return '🐕';
      default: return '🐾';
    }
  }
}
